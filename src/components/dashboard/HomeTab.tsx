import { useState, useRef, useEffect } from "react";
import { Send, TrendingUp, AlertTriangle, MessageCircle, Loader2, Trash2, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ScoreRing from "@/components/ScoreRing";
import EventSlideBoard from "@/components/EventSlideBoard";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileData, ReportData, MetricsData, EventData } from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
  report: ReportData | null;
  metrics: MetricsData | null;
  events: EventData[];
  onProfileUpdated?: () => void;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const HomeTab = ({ profile, report, metrics, events, onProfileUpdated }: Props) => {
  const { t } = useTranslation();
  const [chatMessage, setChatMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showScenarioDialog, setShowScenarioDialog] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const firstName = profile?.fullName?.split(" ")[1] || profile?.fullName?.split(" ")[0] || t("dashboard.fallbackName");
  const isInformal = profile?.incomeStructure === "informal";
  const scenario = profile?.inflationScenario || "moderate";

  // Day 1 Prompt
  const isDayOne = new Date().getDate() === 1;
  const greetingText = isDayOne
    ? `Happy 1st of the month, ${firstName}! 🌟 Let's check in. Last month you made progress on your habits and logs. This month, one action matters most: Review your savings plan and verify the viability of your key business idea.`
    : t("dashboard.home.coachGreeting", { name: firstName });

  const greeting: ChatMessage = {
    role: "assistant",
    content: greetingText,
  };
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([greeting]);

  // Load persisted chat history on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setHistoryLoaded(true); return; }
      const { data, error } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && data && data.length > 0) {
        setChatHistory([greeting, ...data.map(d => ({ role: d.role as "user" | "assistant", content: d.content }))]);
      }
      setHistoryLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const persistMessage = async (role: "user" | "assistant", content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("chat_messages").insert({ user_id: user.id, role, content });
  };

  const handleClearChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("chat_messages").delete().eq("user_id", user.id);
    if (error) {
      toast({ title: t("dashboard.home.errors.clearTitle"), description: error.message, variant: "destructive" });
      return;
    }
    setChatHistory([greeting]);
    toast({ title: t("dashboard.home.errors.cleared") });
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: chatMessage };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatMessage("");
    setIsStreaming(true);

    // Persist user message immediately
    persistMessage("user", userMsg.content);

    // Only send user/assistant messages (skip the initial greeting for API context)
    const apiMessages = newHistory.map(m => ({ role: m.role, content: m.content }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: apiMessages, locale: profile?.language }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast({ title: t("dashboard.home.errors.title"), description: err.error, variant: "destructive" });
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const currentText = assistantSoFar;
              setChatHistory(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > 1 && prev[prev.length - 2]?.role === "user") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: currentText } : m);
                }
                return [...prev, { role: "assistant", content: currentText }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const currentText = assistantSoFar;
              setChatHistory(prev =>
                prev.map((m, i) => i === prev.length - 1 ? { ...m, content: currentText } : m)
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Persist final assistant reply
      if (assistantSoFar.trim()) {
        persistMessage("assistant", assistantSoFar);
      }
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: t("dashboard.home.errors.connection"), description: t("dashboard.home.errors.connectionDesc"), variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleUpdateScenario = async (newScenario: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ inflation_scenario: newScenario } as any)
      .eq("user_id", user.id);
    if (!error) {
      toast({ title: `Assumption updated to ${newScenario} 🚀` });
      if (onProfileUpdated) onProfileUpdated();
    }
  };

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat(profile?.language || "en-NG", { style: "currency", currency: profile?.currency || "NGN", maximumFractionDigits: 0 }).format(amount);

  const pensionGap = report?.pensionGap || 0;
  const sideIncome = metrics?.sideIncome || 0;
  const gapCoverage = pensionGap > 0 ? Math.round((sideIncome / pensionGap) * 100) : 0;

  const getGapRange = (gap: number, scen: string) => {
    if (scen === "conservative") {
      return `${formatNaira(gap * 0.8)} - ${formatNaira(gap * 0.95)}`;
    } else if (scen === "pessimistic") {
      return `${formatNaira(gap * 1.1)} - ${formatNaira(gap * 1.35)}`;
    }
    return `${formatNaira(gap * 0.95)} - ${formatNaira(gap * 1.1)}`;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header with Inflation Scenario Badge */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-heading font-semibold text-muted-foreground">{t("dashboard.home.overview")}</h3>
        <Dialog open={showScenarioDialog} onOpenChange={setShowScenarioDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 border-primary/20 bg-primary/5 hover:bg-primary/10">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs">Assumption: {scenario.toUpperCase()}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inflation Assumption Scenario</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              {["conservative", "moderate", "pessimistic"].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    handleUpdateScenario(s);
                    setShowScenarioDialog(false);
                  }}
                  className={`w-full p-3 border rounded-xl text-left transition-all flex items-center justify-between ${
                    scenario === s ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm capitalize">{s}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s === "conservative" && "Plans for lower, safer inflation assumptions."}
                      {s === "moderate" && "Matches current CPI statistics."}
                      {s === "pessimistic" && "Stress-tests your plan against high inflation."}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {events.length > 0 && (
        <div>
          <EventSlideBoard events={events} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-warm md:row-span-2 flex items-center justify-center p-6">
          <ScoreRing score={report?.readinessScore || 0} />
        </Card>

        <Card className="shadow-warm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> 
              {isInformal ? "Monthly Thrift Target" : t("dashboard.home.monthlyPension")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-primary">
              {formatNaira(isInformal ? (profile?.ajoSavings || 0) : (profile?.pensionProjection || 0))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isInformal ? "Current ajo/thrift savings rate" : t("dashboard.home.monthlyPensionSub")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-secondary" /> 
              {isInformal ? "Retirement Gap" : t("dashboard.home.pensionGap")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-heading font-bold text-secondary">
              {isInformal ? getGapRange(pensionGap, scenario) : formatNaira(pensionGap)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isInformal ? `Retirement gap target range (${scenario})` : t("dashboard.home.pensionGapSub")}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-warm md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> {t("dashboard.home.sideIncome")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-accent">
              {formatNaira(sideIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.home.sideIncomeSub", { percent: gapCoverage })}
            </p>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-1000"
                style={{ width: `${Math.min(gapCoverage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gap Closure Percentage Indicator card */}
      <Card className="border-primary/20 bg-primary/5 shadow-warm">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div>
            <h4 className="font-heading font-semibold text-sm mb-0.5 text-primary">Gap Coverage Score</h4>
            <p className="text-xs text-muted-foreground">
              Your side ideas and savings currently cover <span className="font-bold text-primary">{gapCoverage}%</span> of your {isInformal ? "retirement" : "pension"} gap.
            </p>
          </div>
          <div className="text-2xl font-heading font-black text-primary bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center shrink-0">
            {gapCoverage}%
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-warm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> {t("dashboard.home.coach")}
          </CardTitle>
          {chatHistory.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={isStreaming}
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 me-1" /> {t("dashboard.home.clear")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto space-y-3 mb-3 p-3 rounded-lg bg-muted/50">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg max-w-[85%] ${
                  msg.role === "user"
                    ? "ms-auto bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}
            {isStreaming && chatHistory[chatHistory.length - 1]?.role === "user" && (
              <div className="bg-card border text-sm p-2 rounded-lg max-w-[85%] flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> {t("dashboard.home.thinking")}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder={t("dashboard.home.askPlaceholder")}
              className="flex-1"
              disabled={isStreaming}
            />
            <Button size="icon" onClick={handleSendChat} disabled={isStreaming}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeTab;

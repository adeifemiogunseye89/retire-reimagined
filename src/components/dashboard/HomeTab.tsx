import { useState, useRef, useEffect } from "react";
import { Send, TrendingUp, AlertTriangle, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const HomeTab = ({ profile, report, metrics, events }: Props) => {
  const [chatMessage, setChatMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const firstName = profile?.fullName?.split(" ")[1] || "there";
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: "assistant", content: `Hello ${firstName}! I'm your AI retirement coach. Ask me anything about your pension, business ideas, or next steps. 🌟` },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSendChat = async () => {
    if (!chatMessage.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: chatMessage };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatMessage("");
    setIsStreaming(true);

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
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service error" }));
        toast({ title: "AI Coach Error", description: err.error, variant: "destructive" });
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
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Connection Error", description: "Could not reach AI coach. Please try again.", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

  const pensionGap = report?.pensionGap || 0;
  const sideIncome = metrics?.sideIncome || 0;
  const gapCoverage = pensionGap > 0 ? Math.round((sideIncome / pensionGap) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {events.length > 0 && (
        <div>
          <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-2">📢 Upcoming Events</h3>
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
              <TrendingUp className="h-4 w-4 text-primary" /> Monthly Pension
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-primary">
              {formatNaira(profile?.pensionProjection || 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Expected monthly after retirement</p>
          </CardContent>
        </Card>

        <Card className="shadow-warm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-secondary" /> Pension Gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-secondary">
              {formatNaira(pensionGap)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Monthly shortfall vs current salary</p>
          </CardContent>
        </Card>

        <Card className="shadow-warm md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Current Side Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-heading font-bold text-accent">
              {formatNaira(sideIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {gapCoverage}% of pension gap covered
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

      <Card className="shadow-warm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> AI Retirement Coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto space-y-3 mb-3 p-3 rounded-lg bg-muted/50">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg max-w-[85%] ${
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
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
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Ask about your retirement..."
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

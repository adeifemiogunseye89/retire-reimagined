import { useState } from "react";
import { Send, TrendingUp, AlertTriangle, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ScoreRing from "@/components/ScoreRing";
import EventSlideBoard from "@/components/EventSlideBoard";
import type { ProfileData, ReportData, MetricsData, EventData } from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
  report: ReportData | null;
  metrics: MetricsData | null;
  events: EventData[];
}

const HomeTab = ({ profile, report, metrics, events }: Props) => {
  const [chatMessage, setChatMessage] = useState("");
  const firstName = profile?.fullName?.split(" ")[1] || "there";
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: `Hello ${firstName}! I'm your AI retirement coach. Ask me anything about your pension, business ideas, or next steps. 🌟` },
  ]);

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: chatMessage },
      { role: "assistant", content: "Great question! AI Coach integration coming soon — I'll provide personalized advice based on your profile. 🚀" },
    ]);
    setChatMessage("");
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
          <div className="h-48 overflow-y-auto space-y-3 mb-3 p-3 rounded-lg bg-muted/50">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`text-sm p-2 rounded-lg max-w-[85%] ${
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Ask about your retirement..."
              className="flex-1"
            />
            <Button size="icon" onClick={handleSendChat}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomeTab;

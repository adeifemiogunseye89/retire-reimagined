import { useEffect, useMemo, useState } from "react";
import { TrendingDown, PiggyBank, Flag, Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import GoalsSection from "./GoalsSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { MetricsData, ProfileData } from "@/hooks/useDashboardData";

interface Props {
  metrics: MetricsData | null;
  profile?: ProfileData | null;
}

type MetricType = "savings_contribution" | "side_income" | "milestone";

interface LogEntry {
  id: string;
  metric_type: MetricType | string;
  value: number;
  note: string | null;
  logged_at: string;
}

const MetricsTab = ({ metrics, profile }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [metricType, setMetricType] = useState<MetricType>("savings_contribution");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(profile?.language || "en-US", {
      style: "currency",
      currency: profile?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const fetchLogs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("metric_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(200);
    if (data) setLogs(data as LogEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    const isMilestone = metricType === "milestone";
    const v = isMilestone ? 0 : parseFloat(value);
    if (!isMilestone && (isNaN(v) || v < 0)) {
      toast({ title: "Enter a valid number", variant: "destructive" });
      return;
    }
    if (isMilestone && !note.trim()) {
      toast({ title: "Describe your milestone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("metric_logs")
      .insert({ user_id: user.id, metric_type: metricType, value: v, note: note || null })
      .select()
      .single();
    if (error) {
      toast({ title: "Log failed", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    setLogs([data as LogEntry, ...logs]);
    toast({ title: "Logged" });
    setValue("");
    setNote("");
    setOpen(false);
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("metric_logs").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", variant: "destructive" });
    setLogs(logs.filter(l => l.id !== id));
  };

  // ---------- Derived ----------
  const contributions = useMemo(
    () => logs.filter(l => l.metric_type === "savings_contribution" || l.metric_type === "side_income"),
    [logs]
  );
  const milestones = useMemo(() => logs.filter(l => l.metric_type === "milestone"), [logs]);

  const totalContributed = contributions.reduce((s, l) => s + Number(l.value), 0);

  // Savings-rate this calendar month
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const thisMonthTotal = contributions
    .filter(l => {
      const d = new Date(l.logged_at);
      return `${d.getFullYear()}-${d.getMonth()}` === monthKey;
    })
    .reduce((s, l) => s + Number(l.value), 0);
  const monthlyIncome = profile?.currentSalary || 0;
  const savingsRate = monthlyIncome > 0 ? Math.min(100, Math.round((thisMonthTotal / monthlyIncome) * 100)) : 0;
  const targetRate = 20; // healthy retirement savings rate benchmark

  // Retirement gap closure — annualise cumulative contributions and compare vs. gap
  // Baseline gap: retirementIncomeTarget * 12 - pensionProjection * 12; fallback 0
  const targetMonthly = profile?.retirementIncomeTarget || 0;
  const projectedMonthly = profile?.pensionProjection || 0;
  const annualGap = Math.max(0, (targetMonthly - projectedMonthly) * 12);

  const gapSeries = useMemo(() => {
    if (annualGap <= 0) return [];
    const sorted = [...contributions].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    let cum = 0;
    return sorted.map(l => {
      cum += Number(l.value);
      const remaining = Math.max(0, annualGap - cum);
      const pctClosed = Math.min(100, Math.round((cum / annualGap) * 100));
      return {
        date: new Date(l.logged_at).toLocaleDateString(profile?.language || "en-US", { month: "short", day: "numeric" }),
        gap: remaining,
        pctClosed,
      };
    });
  }, [contributions, annualGap, profile?.language]);

  const pctClosed = gapSeries.length ? gapSeries[gapSeries.length - 1].pctClosed : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold">Progress Metrics</h2>
          <p className="text-sm text-muted-foreground">Track retirement-gap closure, savings discipline, and milestones.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Log</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New entry</DialogTitle>
            </DialogHeader>
            <Tabs value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
              <TabsList className="grid grid-cols-3 h-auto">
                <TabsTrigger value="savings_contribution" className="text-xs">Savings</TabsTrigger>
                <TabsTrigger value="side_income" className="text-xs">Side income</TabsTrigger>
                <TabsTrigger value="milestone" className="text-xs">Milestone</TabsTrigger>
              </TabsList>
              <TabsContent value="savings_contribution" className="space-y-3 pt-4">
                <Label>Amount saved this period ({profile?.currency || "USD"})</Label>
                <Input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
              </TabsContent>
              <TabsContent value="side_income" className="space-y-3 pt-4">
                <Label>Side income earned ({profile?.currency || "USD"})</Label>
                <Input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
              </TabsContent>
              <TabsContent value="milestone" className="space-y-3 pt-4">
                <Label>Milestone description</Label>
                <p className="text-xs text-muted-foreground">e.g. "Registered first business", "Hit 3 months emergency fund".</p>
              </TabsContent>
            </Tabs>
            <div className="space-y-2">
              <Label>Note {metricType === "milestone" ? "" : "(optional)"}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="What happened?" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-warm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingDown className="h-4 w-4 text-primary" /> Retirement gap closed
            </div>
            <p className="text-2xl font-heading font-bold">{pctClosed}%</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {annualGap > 0
                ? `${fmtMoney(totalContributed)} of ${fmtMoney(annualGap)} annual target`
                : "Set a retirement income target to activate."}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-warm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <PiggyBank className="h-4 w-4 text-secondary" /> Savings rate (this month)
            </div>
            <p className="text-2xl font-heading font-bold">{savingsRate}%</p>
            <Progress value={savingsRate} className="h-1.5 mt-2" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Target {targetRate}% • {fmtMoney(thisMonthTotal)} saved
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-warm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Flag className="h-4 w-4 text-accent" /> Milestones logged
            </div>
            <p className="text-2xl font-heading font-bold">{milestones.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {milestones[0]?.note ? `Latest: ${milestones[0].note}` : "Log your first win."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goals section */}
      <GoalsSection profile={profile ?? null} />

      {/* Gap-closure chart */}
      <Card className="shadow-warm">
        <CardContent className="py-5">
          <h3 className="text-sm font-heading font-semibold mb-1">Retirement gap closure</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Remaining annual retirement-income gap as your savings and side income accumulate.
          </p>
          {annualGap <= 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Add a retirement income target in your profile to unlock this chart.
            </p>
          ) : gapSeries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Log a savings contribution or side income to see the curve.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={gapSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtMoney(v)} width={80} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <ReferenceLine y={0} stroke="hsl(var(--secondary))" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="gap" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Milestone log */}
      <Card className="shadow-warm">
        <CardContent className="py-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Milestone log</h3>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : milestones.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No milestones yet. Log wins like "First side-income payout" or "Emergency fund built".
            </p>
          ) : (
            <ul className="space-y-2">
              {milestones.slice(0, 20).map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Flag className="h-3.5 w-3.5 text-accent shrink-0" />
                      <p className="font-medium">{l.note}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground ms-5">
                      {new Date(l.logged_at).toLocaleString(profile?.language || "en-US")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(l.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Contribution history */}
      <Card className="shadow-warm">
        <CardContent className="py-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Recent contributions</h3>
          {contributions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No savings or side income logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {contributions.slice(0, 15).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">
                      {l.metric_type === "savings_contribution" ? "Savings" : "Side income"}:{" "}
                      <span className="text-primary">{fmtMoney(Number(l.value))}</span>
                    </p>
                    {l.note && <p className="text-xs text-muted-foreground truncate">{l.note}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(l.logged_at).toLocaleString(profile?.language || "en-US")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(l.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsTab;

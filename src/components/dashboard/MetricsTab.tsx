import { useEffect, useState } from "react";
import { TrendingUp, Heart, Users, Briefcase, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { MetricsData, ProfileData } from "@/hooks/useDashboardData";

interface Props {
  metrics: MetricsData | null;
  profile?: ProfileData | null;
}

type MetricType = "side_income" | "business_launched" | "anxiety_checkin" | "students_enrolled";

interface LogEntry {
  id: string;
  metric_type: MetricType;
  value: number;
  note: string | null;
  logged_at: string;
}

const METRIC_LABEL: Record<MetricType, string> = {
  side_income: "Side Income",
  business_launched: "Business Launched",
  anxiety_checkin: "Wellness Check-in",
  students_enrolled: "Students Enrolled",
};

const MetricsTab = ({ metrics, profile }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [metricType, setMetricType] = useState<MetricType>("side_income");
  const [value, setValue] = useState("");
  const [anxiety, setAnxiety] = useState([50]);
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
      .limit(100);
    if (data) setLogs(data as LogEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const recomputeAggregates = async (allLogs: LogEntry[]) => {
    if (!user) return;
    const sideIncome = allLogs.filter(l => l.metric_type === "side_income").reduce((s, l) => s + Number(l.value), 0);
    const businesses = allLogs.filter(l => l.metric_type === "business_launched").reduce((s, l) => s + Number(l.value), 0);
    const students = allLogs.filter(l => l.metric_type === "students_enrolled").reduce((s, l) => s + Number(l.value), 0);
    const anxietyLogs = allLogs.filter(l => l.metric_type === "anxiety_checkin");
    const recentAnxiety = anxietyLogs.slice(0, 5);
    const anxietyAvg = recentAnxiety.length
      ? Math.round(recentAnxiety.reduce((s, l) => s + Number(l.value), 0) / recentAnxiety.length)
      : metrics?.anxietyScore ?? 50;

    await supabase.from("user_metrics").upsert(
      {
        user_id: user.id,
        side_income: sideIncome,
        businesses_launched: businesses,
        students_enrolled: students,
        anxiety_score: anxietyAvg,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    const v = metricType === "anxiety_checkin" ? anxiety[0] : parseFloat(value);
    if (metricType !== "anxiety_checkin" && (isNaN(v) || v < 0)) {
      toast({ title: "Enter a valid number", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("metric_logs")
      .insert({ user_id: user.id, metric_type: metricType, value: v, note: note || null })
      .select()
      .single();
    if (error) {
      toast({ title: "Failed to log", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    const newLogs = [data as LogEntry, ...logs];
    setLogs(newLogs);
    await recomputeAggregates(newLogs);
    toast({ title: "Logged!", description: `${METRIC_LABEL[metricType]} entry saved.` });
    setValue("");
    setNote("");
    setAnxiety([50]);
    setOpen(false);
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("metric_logs").delete().eq("id", id);
    if (error) return toast({ title: "Failed to delete", variant: "destructive" });
    const newLogs = logs.filter(l => l.id !== id);
    setLogs(newLogs);
    await recomputeAggregates(newLogs);
  };

  const m = metrics || { sideIncome: 0, businessesLaunched: 0, studentsEnrolled: 0, anxietyScore: 50 };
  const stats = [
    { icon: TrendingUp, label: "Side Income", value: fmtMoney(m.sideIncome), color: "text-primary", bg: "bg-green-light" },
    { icon: Briefcase, label: "Businesses Launched", value: m.businessesLaunched.toString(), color: "text-secondary", bg: "bg-muted" },
    { icon: Users, label: "Students Enrolled", value: m.studentsEnrolled.toString(), color: "text-accent", bg: "bg-blue-light" },
    { icon: Heart, label: "Wellness Score", value: `${100 - m.anxietyScore}/100`, color: "text-primary", bg: "bg-green-light" },
  ];

  // Build cumulative side-income chart data
  const incomeByDay = [...logs]
    .filter(l => l.metric_type === "side_income")
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
  let running = 0;
  const incomeSeries = incomeByDay.map(l => {
    running += Number(l.value);
    return { date: new Date(l.logged_at).toLocaleDateString(profile?.language || "en-US", { month: "short", day: "numeric" }), total: running };
  });

  const anxietySeries = [...logs]
    .filter(l => l.metric_type === "anxiety_checkin")
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map(l => ({
      date: new Date(l.logged_at).toLocaleDateString(profile?.language || "en-US", { month: "short", day: "numeric" }),
      wellness: 100 - Number(l.value),
    }));

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold">Metrics & Progress</h2>
          <p className="text-sm text-muted-foreground">Log income, launches, and check-ins over time</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Log</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a new entry</DialogTitle>
            </DialogHeader>
            <Tabs value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
              <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto">
                <TabsTrigger value="side_income" className="text-xs">Income</TabsTrigger>
                <TabsTrigger value="business_launched" className="text-xs">Launch</TabsTrigger>
                <TabsTrigger value="students_enrolled" className="text-xs">Students</TabsTrigger>
                <TabsTrigger value="anxiety_checkin" className="text-xs">Check-in</TabsTrigger>
              </TabsList>

              <TabsContent value="side_income" className="space-y-3 pt-4">
                <Label>Amount earned ({profile?.currency || "USD"})</Label>
                <Input type="number" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
              </TabsContent>
              <TabsContent value="business_launched" className="space-y-3 pt-4">
                <Label>How many businesses launched?</Label>
                <Input type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="1" />
              </TabsContent>
              <TabsContent value="students_enrolled" className="space-y-3 pt-4">
                <Label>How many students enrolled?</Label>
                <Input type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
              </TabsContent>
              <TabsContent value="anxiety_checkin" className="space-y-3 pt-4">
                <Label>Anxiety level: <span className="font-bold">{anxiety[0]}</span> / 100</Label>
                <Slider min={0} max={100} step={1} value={anxiety} onValueChange={setAnxiety} />
                <p className="text-xs text-muted-foreground">0 = totally calm · 100 = very anxious. Wellness score = 100 − anxiety.</p>
              </TabsContent>
            </Tabs>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="What happened?" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="shadow-warm">
            <CardContent className="py-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-heading font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-warm">
        <CardContent className="py-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Cumulative Side Income</h3>
          {incomeSeries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No income logged yet — tap "Log" to add your first entry.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={incomeSeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtMoney(v)} width={70} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-warm">
        <CardContent className="py-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Wellness Trend</h3>
          {anxietySeries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No check-ins yet — log how you're feeling to start tracking.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={anxietySeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} width={30} />
                <Tooltip />
                <Line type="monotone" dataKey="wellness" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-warm">
        <CardContent className="py-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Recent Entries</h3>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.slice(0, 15).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {METRIC_LABEL[l.metric_type]}: {" "}
                      <span className="text-primary">
                        {l.metric_type === "side_income" ? fmtMoney(Number(l.value)) : Number(l.value)}
                      </span>
                    </p>
                    {l.note && <p className="text-xs text-muted-foreground truncate">{l.note}</p>}
                    <p className="text-[10px] text-muted-foreground">{new Date(l.logged_at).toLocaleString(profile?.language || "en-US")}</p>
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

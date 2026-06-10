import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Activity, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Obs {
  errors_total: number;
  errors_affected_users: number;
  errors_by_day: { day: string; count: number }[];
  top_errors: { message: string; count: number; users: number; sample_stack: string | null; last_seen: string }[];
  pageviews_total: number;
  tab_usage: { tab: string; count: number }[];
  route_usage: { route: string; count: number }[];
}

const AdminObservability = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [data, setData] = useState<Obs | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    supabase.rpc("admin_observability", { _days: days }).then(({ data }) => {
      setData(data as unknown as Obs);
      setLoading(false);
    });
  }, [isAdmin, days]);

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Admin access required.</p>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>Back</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-5xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">Observability</h1>
            <p className="text-xs opacity-80">Errors, usage, and edge-function activity</p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-primary-foreground/10 text-primary-foreground text-sm px-2 py-1 rounded border border-primary-foreground/20"
          >
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7d</option>
            <option value={30}>Last 30d</option>
          </select>
        </div>
      </div>

      <div className="container max-w-5xl px-4 py-6 space-y-4">
        {loading || !data ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<AlertTriangle className="h-4 w-4" />} label={`Errors (${days}d)`} value={data.errors_total} />
              <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Users affected" value={data.errors_affected_users} />
              <StatCard icon={<Activity className="h-4 w-4" />} label="Page views (30d)" value={data.pageviews_total} />
              <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Top tab" value={data.tab_usage[0]?.tab || "—"} />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Errors over time</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.errors_by_day}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--destructive))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top errors</CardTitle></CardHeader>
              <CardContent>
                {data.top_errors.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No errors recorded. 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {data.top_errors.map((e, i) => (
                      <details key={i} className="border rounded-lg p-3 text-sm">
                        <summary className="cursor-pointer flex items-center justify-between gap-2">
                          <span className="font-mono text-xs truncate flex-1">{e.message}</span>
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {e.count}× · {e.users} users
                          </span>
                        </summary>
                        {e.sample_stack && (
                          <pre className="mt-2 text-[10px] bg-muted p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">{e.sample_stack}</pre>
                        )}
                      </details>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Tab usage (30d)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.tab_usage}>
                        <XAxis dataKey="tab" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Route usage (30d)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {data.route_usage.map((r) => (
                      <div key={r.route} className="flex items-center justify-between border-b last:border-0 py-1">
                        <span className="font-mono text-xs truncate">{r.route}</span>
                        <span className="text-muted-foreground">{r.count}</span>
                      </div>
                    ))}
                    {data.route_usage.length === 0 && <p className="text-muted-foreground text-xs">No data yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              Edge function logs are available via Lovable Cloud logs panel in the project workspace.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Card>
    <CardContent className="py-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">{icon}{label}</div>
      <p className="text-xl font-heading font-bold mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </CardContent>
  </Card>
);

export default AdminObservability;

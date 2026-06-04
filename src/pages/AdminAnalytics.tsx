import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Metrics {
  total_users: number;
  new_users_7d: number;
  new_users_30d: number;
  reports: number;
  ideas: number;
  active_events: number;
  by_country: { country: string; count: number }[];
}

const AdminAnalytics = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.rpc("admin_metrics");
      setMetrics(data as unknown as Metrics);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (roleLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">{t("admin.events.noAccess")}</p>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>{t("common.back")}</Button>
    </div>
  );

  const cards = [
    { label: t("admin.analytics.totalUsers"), value: metrics?.total_users ?? 0 },
    { label: t("admin.analytics.new7d"), value: metrics?.new_users_7d ?? 0 },
    { label: t("admin.analytics.new30d"), value: metrics?.new_users_30d ?? 0 },
    { label: t("admin.analytics.reports"), value: metrics?.reports ?? 0 },
    { label: t("admin.analytics.ideas"), value: metrics?.ideas ?? 0 },
    { label: t("admin.analytics.activeEvents"), value: metrics?.active_events ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-4xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-heading font-bold">{t("admin.analytics.title")}</h1>
            <p className="text-xs opacity-80">{t("admin.analytics.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map((c) => (
            <Card key={c.label} className="shadow-warm">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-heading font-bold">{c.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("admin.analytics.byCountry")}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.by_country || []}>
                  <XAxis dataKey="country" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;

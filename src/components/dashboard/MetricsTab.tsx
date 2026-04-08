import { TrendingUp, Heart, Users, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { mockMetrics } from "@/lib/mock-data";

/**
 * KPI metrics and charts: income growth, student enrollment, wellness tracking.
 */
const MetricsTab = () => {
  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

  const stats = [
    {
      icon: TrendingUp,
      label: "Side Income",
      value: formatNaira(mockMetrics.sideIncome),
      color: "text-primary",
      bg: "bg-green-light",
    },
    {
      icon: Briefcase,
      label: "Businesses Launched",
      value: mockMetrics.businessesLaunched.toString(),
      color: "text-secondary",
      bg: "bg-muted",
    },
    {
      icon: Users,
      label: "Students Enrolled",
      value: mockMetrics.studentsEnrolled.toString(),
      color: "text-accent",
      bg: "bg-blue-light",
    },
    {
      icon: Heart,
      label: "Wellness Score",
      value: `${100 - mockMetrics.anxietyScore}/100`,
      color: "text-primary",
      bg: "bg-green-light",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-heading font-bold">Metrics & Progress</h2>
        <p className="text-sm text-muted-foreground">Track your journey from retirement to reignition</p>
      </div>

      {/* Stats grid */}
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

      {/* Income Growth Chart */}
      <Card className="shadow-warm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Side Income Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMetrics.sideIncomeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(value: number) => [formatNaira(value), "Income"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Wellness Chart */}
      <Card className="shadow-warm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Anxiety Score Trend (Lower is Better)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockMetrics.anxietyHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsTab;

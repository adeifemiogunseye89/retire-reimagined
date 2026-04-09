import { TrendingUp, Heart, Users, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { MetricsData } from "@/hooks/useDashboardData";

interface Props {
  metrics: MetricsData | null;
}

const MetricsTab = ({ metrics }: Props) => {
  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

  const m = metrics || { sideIncome: 0, businessesLaunched: 0, studentsEnrolled: 0, anxietyScore: 50 };

  const stats = [
    { icon: TrendingUp, label: "Side Income", value: formatNaira(m.sideIncome), color: "text-primary", bg: "bg-green-light" },
    { icon: Briefcase, label: "Businesses Launched", value: m.businessesLaunched.toString(), color: "text-secondary", bg: "bg-muted" },
    { icon: Users, label: "Students Enrolled", value: m.studentsEnrolled.toString(), color: "text-accent", bg: "bg-blue-light" },
    { icon: Heart, label: "Wellness Score", value: `${100 - m.anxietyScore}/100`, color: "text-primary", bg: "bg-green-light" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-heading font-bold">Metrics & Progress</h2>
        <p className="text-sm text-muted-foreground">Track your journey from retirement to reignition</p>
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
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            📊 Charts will populate as you track your income and progress over time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsTab;

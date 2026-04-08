import { Download, Lightbulb, TrendingDown, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScoreRing from "@/components/ScoreRing";
import { mockUser, mockReport } from "@/lib/mock-data";

/**
 * Full AI-generated readiness report with pension analysis and recommendations.
 */
const ReportTab = () => {
  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold">Your AI Readiness Report</h2>
          <p className="text-sm text-muted-foreground">
            Generated for {mockUser.fullName} • {mockUser.sector} • {mockUser.gradeLevel}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      {/* Score + Summary */}
      <Card className="shadow-warm">
        <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={mockReport.readinessScore} size={140} />
          <div className="flex-1 space-y-2">
            <h3 className="font-heading font-semibold text-lg">
              You are <span className="text-primary">{mockReport.readinessScore}% ready</span> for retirement
            </h3>
            <p className="text-sm text-muted-foreground">
              With {mockUser.yearsInService} years of service in {mockUser.sector} at {mockUser.gradeLevel},
              your pension will cover about {Math.round((mockUser.pensionProjection / mockUser.currentSalary) * 100)}%
              of your current salary.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pension Gap Analysis */}
      <Card className="shadow-warm border-l-4 border-l-secondary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-secondary" /> Pension Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 rounded-lg bg-green-light">
              <p className="text-xs text-muted-foreground">Current Salary</p>
              <p className="text-lg font-heading font-bold text-primary">{formatNaira(mockUser.currentSalary)}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-light">
              <p className="text-xs text-muted-foreground">Projected Pension</p>
              <p className="text-lg font-heading font-bold text-accent">{formatNaira(mockUser.pensionProjection)}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-xs text-muted-foreground">Monthly Gap</p>
            <p className="text-xl font-heading font-bold text-secondary">{formatNaira(mockReport.pensionGap)}</p>
          </div>
          <p className="text-xs text-muted-foreground italic">⚠️ {mockReport.inflationNote}</p>
        </CardContent>
      </Card>

      {/* Top 3 Business Ideas Summary */}
      <Card className="shadow-warm border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-secondary" /> Top 3 Recommended Business Ideas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockReport.topIdeas.map((idea, i) => (
            <div key={idea.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className="flex-shrink-0 w-7 h-7 rounded-full gradient-gold flex items-center justify-center text-sm font-bold text-secondary-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-heading font-semibold">{idea.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projected: {formatNaira(idea.projectedIncome)}/mo
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="shadow-warm border-l-4 border-l-accent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" /> Your Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {mockReport.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="flex-shrink-0 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  {i + 1}
                </Badge>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportTab;

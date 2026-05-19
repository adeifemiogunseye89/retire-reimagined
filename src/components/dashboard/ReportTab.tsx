import { Download, Lightbulb, TrendingDown, CheckCircle2, FileX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScoreRing from "@/components/ScoreRing";
import type { ProfileData, ReportData } from "@/hooks/useDashboardData";
import { downloadReportPDF } from "@/lib/report-pdf";
import { useToast } from "@/hooks/use-toast";

interface Props {
  profile: ProfileData | null;
  report: ReportData | null;
}

const ReportTab = ({ profile, report }: Props) => {
  const { toast } = useToast();
  const handleExport = () => {
    if (!report) return;
    try {
      downloadReportPDF(profile, report);
      toast({ title: "Report downloaded 📄" });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };
  const formatNaira = (amount: number) =>
    new Intl.NumberFormat(profile?.language || "en-NG", { style: "currency", currency: profile?.currency || "NGN", maximumFractionDigits: 0 }).format(amount);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 animate-fade-up">
        <FileX className="h-12 w-12 text-muted-foreground" />
        <h3 className="font-heading font-semibold text-lg">No report generated yet</h3>
        <p className="text-sm text-muted-foreground">Complete the assessment to generate your AI readiness report.</p>
      </div>
    );
  }

  const salaryPercent = profile && profile.currentSalary > 0
    ? Math.round((profile.pensionProjection / profile.currentSalary) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold">Your AI Readiness Report</h2>
          <p className="text-sm text-muted-foreground">
            Generated for {profile?.fullName} • {profile?.sector} • {profile?.gradeLevel}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      <Card className="shadow-warm">
        <CardContent className="pt-6 flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={report.readinessScore} size={140} />
          <div className="flex-1 space-y-2">
            <h3 className="font-heading font-semibold text-lg">
              You are <span className="text-primary">{report.readinessScore}% ready</span> for retirement
            </h3>
            <p className="text-sm text-muted-foreground">
              With {profile?.yearsInService} years of service in {profile?.sector} at {profile?.gradeLevel},
              your pension will cover about {salaryPercent}% of your current salary.
            </p>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-lg font-heading font-bold text-primary">{formatNaira(profile?.currentSalary || 0)}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-light">
              <p className="text-xs text-muted-foreground">Projected Pension</p>
              <p className="text-lg font-heading font-bold text-accent">{formatNaira(profile?.pensionProjection || 0)}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-xs text-muted-foreground">Monthly Gap</p>
            <p className="text-xl font-heading font-bold text-secondary">{formatNaira(report.pensionGap)}</p>
          </div>
          <p className="text-xs text-muted-foreground italic">⚠️ {report.inflationNote}</p>
        </CardContent>
      </Card>

      {report.topIdeas.length > 0 && (
        <Card className="shadow-warm border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-secondary" /> Top {report.topIdeas.length} Recommended Business Ideas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.topIdeas.map((idea, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
      )}

      {report.nextSteps.length > 0 && (
        <Card className="shadow-warm border-l-4 border-l-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Your Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.nextSteps.map((step, i) => (
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
      )}
    </div>
  );
};

export default ReportTab;

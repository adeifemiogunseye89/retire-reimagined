import { useState } from "react";
import { Lightbulb, TrendingUp, FileText, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockReport } from "@/lib/mock-data";

/**
 * Expandable business idea cards with Gamma API integration placeholder.
 */
const IdeasTab = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

  const statusColors: Record<string, string> = {
    idea: "bg-blue-light text-accent",
    launched: "bg-green-light text-primary",
    scaled: "bg-muted text-secondary",
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-heading font-bold">My Business Ideas</h2>
        <p className="text-sm text-muted-foreground">AI-generated ideas tailored to your profile and skills</p>
      </div>

      <div className="space-y-4">
        {mockReport.topIdeas.map((idea, i) => {
          const isExpanded = expandedId === idea.id;
          return (
            <Card key={idea.id} className="shadow-warm overflow-hidden transition-all">
              <CardHeader
                className="cursor-pointer pb-2"
                onClick={() => setExpandedId(isExpanded ? null : idea.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <CardTitle className="text-base leading-tight">{idea.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${statusColors[idea.status]}`}>
                          {idea.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> {formatNaira(idea.projectedIncome)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4 animate-fade-up">
                  <p className="text-sm text-muted-foreground">{idea.description}</p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button className="flex-1 gradient-gold text-secondary-foreground shadow-gold">
                      <Sparkles className="h-4 w-4 mr-2" /> Generate Business Plan (Gamma)
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" /> View Details
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add custom idea */}
      <Card className="border-dashed border-2 shadow-none">
        <CardContent className="py-8 flex flex-col items-center gap-2">
          <Lightbulb className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">Have your own idea?</p>
          <Button variant="outline" size="sm">
            Add Custom Business Idea
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default IdeasTab;

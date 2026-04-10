import { useState } from "react";
import { Lightbulb, TrendingUp, FileText, ChevronDown, ChevronUp, Sparkles, FileX, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BusinessIdea } from "@/hooks/useDashboardData";

interface Props {
  ideas: BusinessIdea[];
  onIdeaAdded?: () => void;
}

const IdeasTab = ({ ideas, onIdeaAdded }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectedIncome, setProjectedIncome] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const formatNaira = (amount: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

  const statusColors: Record<string, string> = {
    idea: "bg-blue-light text-accent",
    launched: "bg-green-light text-primary",
    scaled: "bg-muted text-secondary",
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("business_ideas").insert({
      user_id: user.id,
      idea_title: title.trim(),
      description: description.trim() || null,
      projected_monthly_income: projectedIncome ? Number(projectedIncome) : null,
      status: "idea",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save idea. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Idea saved!", description: "Your business idea has been added." });
      setTitle("");
      setDescription("");
      setProjectedIncome("");
      setDialogOpen(false);
      onIdeaAdded?.();
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold">My Business Ideas</h2>
          <p className="text-sm text-muted-foreground">AI-generated ideas tailored to your profile and skills</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gradient-hero text-primary-foreground">
              <Plus className="h-4 w-4 mr-1" /> Add Idea
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Business Idea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="idea-title">Title *</Label>
                <Input id="idea-title" placeholder="e.g. Online tutoring service" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idea-desc">Description</Label>
                <Textarea id="idea-desc" placeholder="Describe your business idea..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idea-income">Projected Monthly Income (₦)</Label>
                <Input id="idea-income" type="number" placeholder="e.g. 150000" value={projectedIncome} onChange={(e) => setProjectedIncome(e.target.value)} min={0} />
              </div>
              <Button onClick={handleSubmit} disabled={saving || !title.trim()} className="w-full gradient-gold text-secondary-foreground shadow-gold">
                {saving ? "Saving..." : "Save Idea"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <FileX className="h-12 w-12 text-muted-foreground" />
          <h3 className="font-heading font-semibold text-lg">No ideas yet</h3>
          <p className="text-sm text-muted-foreground">Complete the assessment or add your own business idea.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea, i) => {
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
                          <Badge className={`text-xs ${statusColors[idea.status] || statusColors.idea}`}>
                            {idea.status}
                          </Badge>
                          {idea.projectedIncome > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" /> {formatNaira(idea.projectedIncome)}/mo
                            </span>
                          )}
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
                    <p className="text-sm text-muted-foreground">{idea.description || "No description provided."}</p>
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
      )}
    </div>
  );
};

export default IdeasTab;

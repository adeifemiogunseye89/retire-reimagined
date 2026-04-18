import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  Calculator,
  Link2,
  TrendingUp,
  Wallet,
  PiggyBank,
  Briefcase,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  BusinessIdea,
  SavingsPlanData,
} from "@/hooks/useDashboardData";

interface CostItem {
  id: string;
  name: string;
  amount: number;
  category: "one_time" | "recurring_monthly" | "recurring_yearly";
}

interface BudgetAnalysis {
  inflation_rate: number;
  inflation_source_note: string;
  total_nominal: number;
  total_real: number;
  inflation_gap: number;
  funding_from_savings: number;
  funding_from_monthly_target: number;
  funding_from_business_income: number;
  funding_shortfall: number;
  headline_message: string;
  recommendations: string[];
  yearly_projection: { year: number; nominal: number; real: number }[];
}

interface ProjectBudget {
  id: string;
  project_name: string;
  description: string | null;
  timeline_months: number;
  linked_idea_id: string | null;
  cost_items: CostItem[];
  ai_analysis: BudgetAnalysis | null;
  last_inflation_rate: number | null;
  last_analysis_at: string | null;
}

interface Props {
  ideas: BusinessIdea[];
  savingsPlan: SavingsPlanData | null;
}

const formatNaira = (n: number) =>
  `₦${Math.round(n || 0).toLocaleString("en-NG")}`;

const newCostItem = (): CostItem => ({
  id: crypto.randomUUID(),
  name: "",
  amount: 0,
  category: "one_time",
});

const BudgetEstimator = ({ ideas, savingsPlan }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectBudget[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Local working copy of the active project (for editing without spam-saving)
  const [draft, setDraft] = useState<ProjectBudget | null>(null);
  const active = projects.find((p) => p.id === activeId) ?? null;

  // Load projects
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("project_budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const mapped: ProjectBudget[] = (data ?? []).map((p: any) => ({
      id: p.id,
      project_name: p.project_name,
      description: p.description,
      timeline_months: p.timeline_months,
      linked_idea_id: p.linked_idea_id,
      cost_items: Array.isArray(p.cost_items) ? p.cost_items : [],
      ai_analysis: p.ai_analysis,
      last_inflation_rate: p.last_inflation_rate
        ? Number(p.last_inflation_rate)
        : null,
      last_analysis_at: p.last_analysis_at,
    }));

    setProjects(mapped);
    if (mapped.length > 0 && !activeId) setActiveId(mapped[0].id);
    setLoading(false);
  }, [user, activeId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`project-budgets-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_budgets",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchProjects()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProjects]);

  // Sync draft with active project
  useEffect(() => {
    if (active) setDraft({ ...active, cost_items: [...active.cost_items] });
    else setDraft(null);
  }, [activeId, active?.id]);

  const createProject = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("project_budgets")
      .insert({
        user_id: user.id,
        project_name: newName.trim(),
        timeline_months: 12,
        cost_items: [],
      })
      .select()
      .single();
    setCreating(false);
    setShowNewDialog(false);
    setNewName("");
    if (error) {
      toast({
        title: "Could not create project",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    if (data) {
      setActiveId(data.id);
      toast({ title: "Project created 🌱" });
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project budget?")) return;
    await supabase.from("project_budgets").delete().eq("id", id);
    if (activeId === id) setActiveId(null);
  };

  const updateDraft = (patch: Partial<ProjectBudget>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const addCostItem = () => {
    if (!draft) return;
    updateDraft({ cost_items: [...draft.cost_items, newCostItem()] });
  };

  const updateCostItem = (id: string, patch: Partial<CostItem>) => {
    if (!draft) return;
    updateDraft({
      cost_items: draft.cost_items.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  };

  const removeCostItem = (id: string) => {
    if (!draft) return;
    updateDraft({
      cost_items: draft.cost_items.filter((c) => c.id !== id),
    });
  };

  const linkToIdea = (ideaId: string) => {
    if (!draft) return;
    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return;
    updateDraft({
      linked_idea_id: idea.id,
      project_name: draft.project_name || idea.title,
      description: draft.description || idea.description,
    });
    toast({ title: `Linked to "${idea.title}"` });
  };

  const saveDraft = async (silent = false) => {
    if (!user || !draft) return false;
    const { error } = await supabase
      .from("project_budgets")
      .update({
        project_name: draft.project_name,
        description: draft.description,
        timeline_months: draft.timeline_months,
        linked_idea_id: draft.linked_idea_id,
        cost_items: draft.cost_items as any,
      })
      .eq("id", draft.id);
    if (error) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
    if (!silent) toast({ title: "Project saved 💚" });
    return true;
  };

  const runAnalysis = async () => {
    if (!user || !draft) return;
    if (draft.cost_items.length === 0) {
      toast({
        title: "Add at least one cost item first",
        variant: "destructive",
      });
      return;
    }
    setAnalyzing(true);
    try {
      const ok = await saveDraft(true);
      if (!ok) throw new Error("Could not save before analysis");

      const linkedIdea = draft.linked_idea_id
        ? ideas.find((i) => i.id === draft.linked_idea_id)
        : null;

      const { data: { session } } = await supabase.auth.getSession();
      const token =
        session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budget-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            project_id: draft.id,
            project_name: draft.project_name,
            description: draft.description,
            timeline_months: draft.timeline_months,
            cost_items: draft.cost_items,
            linked_idea: linkedIdea
              ? {
                  title: linkedIdea.title,
                  projectedIncome: linkedIdea.projectedIncome,
                }
              : null,
            savings_plan: savingsPlan,
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${resp.status})`);
      }

      toast({ title: "Budget analyzed against inflation 🔥" });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // ---- Empty / loading states ----
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Calculator className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">
              Plan a real project, inflation-proofed
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Build deliberate budgets for your post-retirement projects —
              poultry, tutoring, rentals — and watch real costs adjust to
              inflation automatically.
            </p>
          </div>
          <NewProjectButton
            value={newName}
            onChange={setNewName}
            onCreate={createProject}
            creating={creating}
            open={showNewDialog}
            onOpenChange={setShowNewDialog}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Project picker */}
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <Select value={activeId ?? ""} onValueChange={setActiveId}>
          <SelectTrigger className="w-auto min-w-[200px] flex-1 max-w-sm">
            <SelectValue placeholder="Choose a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.project_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <NewProjectButton
          value={newName}
          onChange={setNewName}
          onCreate={createProject}
          creating={creating}
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
          compact
        />
        {active && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteProject(active.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {draft && (
        <>
          {/* Project setup */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">
                Project Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Project name</Label>
                  <Input
                    value={draft.project_name}
                    onChange={(e) =>
                      updateDraft({ project_name: e.target.value })
                    }
                    placeholder="e.g. Poultry Farm Startup"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Timeline (months from now)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={draft.timeline_months}
                    onChange={(e) =>
                      updateDraft({
                        timeline_months: Math.max(
                          1,
                          Math.min(120, Number(e.target.value) || 1)
                        ),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={2}
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    updateDraft({ description: e.target.value })
                  }
                  placeholder="What is this project? Who is it for?"
                />
              </div>

              {ideas.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    Link to an existing business idea
                  </Label>
                  <Select
                    value={draft.linked_idea_id ?? ""}
                    onValueChange={linkToIdea}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a business idea (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {ideas.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.title} — {formatNaira(i.projectedIncome)}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cost breakdown */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-heading">
                Cost Breakdown
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addCostItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add item
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {draft.cost_items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No cost items yet. Click <strong>Add item</strong> to start.
                </p>
              ) : (
                draft.cost_items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-end pb-2 border-b border-border/50 last:border-0"
                  >
                    <div className="col-span-12 md:col-span-5 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Item
                      </Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateCostItem(item.id, { name: e.target.value })
                        }
                        placeholder="e.g. Land lease"
                      />
                    </div>
                    <div className="col-span-6 md:col-span-3 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Amount (₦)
                      </Label>
                      <Input
                        type="number"
                        value={item.amount || ""}
                        onChange={(e) =>
                          updateCostItem(item.id, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-5 md:col-span-3 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Category
                      </Label>
                      <Select
                        value={item.category}
                        onValueChange={(v) =>
                          updateCostItem(item.id, {
                            category: v as CostItem["category"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_time">One-time</SelectItem>
                          <SelectItem value="recurring_monthly">
                            Monthly
                          </SelectItem>
                          <SelectItem value="recurring_yearly">
                            Yearly
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCostItem(item.id)}
                      className="col-span-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}

              <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Nominal total:</span>{" "}
                  <strong className="text-primary text-base">
                    {formatNaira(computeNominalTotal(draft))}
                  </strong>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveDraft()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="gap-1.5 gradient-hero text-primary-foreground"
                  >
                    {analyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {draft.ai_analysis ? "Re-analyze" : "Analyze budget"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis dashboard */}
          {draft.ai_analysis ? (
            <AnalysisView
              analysis={draft.ai_analysis}
              savingsPlan={savingsPlan}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium">
                  Run analysis to see inflation-adjusted budget
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll compute real costs and personalized funding
                  recommendations.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const computeNominalTotal = (p: ProjectBudget) => {
  const months = p.timeline_months;
  return p.cost_items.reduce((s, i) => {
    const amt = Number(i.amount) || 0;
    if (i.category === "one_time") return s + amt;
    if (i.category === "recurring_monthly") return s + amt * months;
    return s + amt * (months / 12);
  }, 0);
};

const NewProjectButton = ({
  value,
  onChange,
  onCreate,
  creating,
  open,
  onOpenChange,
  compact,
}: {
  value: string;
  onChange: (v: string) => void;
  onCreate: () => void;
  creating: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  compact?: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button
        size={compact ? "sm" : "default"}
        className="gap-1.5 gradient-hero text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        {compact ? "New" : "Start a project budget"}
      </Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Name your project</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <Input
          autoFocus
          placeholder="e.g. Poultry Farm Startup"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onCreate();
          }}
        />
        <Button
          onClick={onCreate}
          disabled={creating || !value.trim()}
          className="w-full gradient-hero text-primary-foreground"
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Create project"
          )}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const AnalysisView = ({
  analysis,
  savingsPlan,
}: {
  analysis: BudgetAnalysis;
  savingsPlan: SavingsPlanData | null;
}) => (
  <div className="space-y-4">
    <Card className="overflow-hidden border-2 border-primary/30">
      <div className="gradient-hero p-5 text-primary-foreground">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <h3 className="font-heading font-semibold">
              Inflation-Adjusted Budget
            </h3>
          </div>
          <Badge
            variant="secondary"
            className="bg-primary-foreground/20 text-primary-foreground border-0"
          >
            {analysis.inflation_rate.toFixed(1)}% inflation
          </Badge>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">
          {analysis.headline_message}
        </p>
        <p className="text-[11px] opacity-70 mt-2">
          {analysis.inflation_source_note}
        </p>
      </div>

      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            label="Nominal cost"
            value={formatNaira(analysis.total_nominal)}
            sub="today's estimate"
          />
          <Stat
            label="Real cost"
            value={formatNaira(analysis.total_real)}
            sub="inflation-adjusted"
            accent
          />
          <Stat
            label="Inflation gap"
            value={formatNaira(analysis.inflation_gap)}
            sub="extra needed"
            warning
          />
        </div>

        {analysis.yearly_projection?.length > 0 && (
          <div className="h-56 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysis.yearly_projection}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) =>
                    v >= 1000000
                      ? `${(v / 1000000).toFixed(1)}M`
                      : `${(v / 1000).toFixed(0)}k`
                  }
                />
                <RTooltip
                  formatter={(v: number) => formatNaira(v)}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="nominal"
                  name="Nominal"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="real"
                  name="Real (inflation-adjusted)"
                  stroke="hsl(var(--gold))"
                  strokeWidth={2.5}
                  strokeDasharray="5 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Recommendations */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {analysis.recommendations.slice(0, 4).map((rec, idx) => (
        <Card key={idx} className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <div className="rounded-full bg-primary/15 p-2 shrink-0 h-fit">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs leading-relaxed text-foreground/90">
                {rec}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Funding plan */}
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Funding Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <FundingRow
          icon={<PiggyBank className="h-4 w-4" />}
          label="From current savings"
          value={analysis.funding_from_savings}
          hint={
            savingsPlan
              ? `You have ${formatNaira(savingsPlan.currentSavings)}`
              : undefined
          }
        />
        <FundingRow
          icon={<TrendingUp className="h-4 w-4" />}
          label="From monthly savings target"
          value={analysis.funding_from_monthly_target}
          hint={
            savingsPlan
              ? `${formatNaira(savingsPlan.monthlySavingsTarget)}/mo`
              : undefined
          }
        />
        <FundingRow
          icon={<Briefcase className="h-4 w-4" />}
          label="From business income"
          value={analysis.funding_from_business_income}
        />
        <div className="pt-3 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${
                analysis.funding_shortfall > 0
                  ? "text-destructive"
                  : "text-primary"
              }`}
            />
            <span className="text-sm font-medium">Remaining shortfall</span>
          </div>
          <strong
            className={`text-base ${
              analysis.funding_shortfall > 0
                ? "text-destructive"
                : "text-primary"
            }`}
          >
            {formatNaira(Math.max(0, analysis.funding_shortfall))}
          </strong>
        </div>
      </CardContent>
    </Card>
  </div>
);

const Stat = ({
  label,
  value,
  sub,
  accent,
  warning,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  warning?: boolean;
}) => (
  <div
    className={`rounded-lg p-3 border ${
      warning
        ? "bg-destructive/5 border-destructive/30"
        : accent
        ? "bg-gold/10 border-gold/40"
        : "bg-muted/40 border-border"
    }`}
  >
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
      {label}
    </p>
    <p
      className={`text-base md:text-lg font-heading font-bold mt-1 ${
        warning ? "text-destructive" : accent ? "text-gold" : "text-foreground"
      }`}
    >
      {value}
    </p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
  </div>
);

const FundingRow = ({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
}) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2 min-w-0">
      <div className="rounded-md bg-primary/10 p-1.5 text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {hint && (
          <p className="text-[10px] text-muted-foreground truncate">{hint}</p>
        )}
      </div>
    </div>
    <strong className="text-sm text-primary shrink-0">
      {formatNaira(value)}
    </strong>
  </div>
);

export default BudgetEstimator;

import { useMemo, useState } from "react";
import { TrendingUp, ChevronDown, ChevronUp, ShieldCheck, Plus, Pencil, Trash2, Loader2, Sparkles, Library, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { BusinessIdea, ProfileData } from "@/hooks/useDashboardData";
import { ideasForCountry, type InformalIdea } from "@/lib/informal-idea-library";

interface Props {
  ideas: BusinessIdea[];
  profile?: ProfileData | null;
  onIdeaAdded?: () => void;
}

const STATUSES = ["idea", "validating", "launched", "scaled", "paused"] as const;
type Status = (typeof STATUSES)[number];

const statusColors: Record<string, string> = {
  idea: "bg-blue-light text-accent",
  validating: "bg-muted text-foreground",
  launched: "bg-green-light text-primary",
  scaled: "bg-secondary/20 text-secondary",
  paused: "bg-muted text-muted-foreground",
};

interface ViabilityNotes {
  score?: number;
  verdict?: string;
  strengths?: string[];
  risks?: string[];
  next_steps?: string[];
  realistic_monthly_income?: number;
}

const scoreColor = (n: number) =>
  n >= 75 ? "text-primary" : n >= 50 ? "text-accent" : n >= 25 ? "text-amber-600" : "text-destructive";

// Naive USD → local conversion for library display. Real rates handled by AI viability check.
const USD_TO_LOCAL: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.78, NGN: 1600, GHS: 15, KES: 130, ZAR: 18, CAD: 1.35,
};

const IdeasTab = ({ ideas, profile, onIdeaAdded }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectedIncome, setProjectedIncome] = useState("");
  const [status, setStatus] = useState<Status>("idea");
  const { toast } = useToast();
  const { user } = useAuth();

  const currency = profile?.currency || "USD";
  const locale = profile?.language || "en-US";
  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  const usdToLocal = (usd: number) => usd * (USD_TO_LOCAL[currency] ?? 1);

  const isInformal = profile?.incomeStructure === "informal" || profile?.incomeStructure === "mixed";

  // Annual retirement-income gap for per-idea coverage math
  const annualGap = Math.max(
    0,
    ((profile?.retirementIncomeTarget || 0) - (profile?.pensionProjection || 0)) * 12
  );

  const libraryIdeas = useMemo(() => ideasForCountry(profile?.country), [profile?.country]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setProjectedIncome(""); setStatus("idea"); setEditingId(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };
  const openEdit = (idea: BusinessIdea) => {
    setEditingId(idea.id);
    setTitle(idea.title);
    setDescription(idea.description || "");
    setProjectedIncome(idea.projectedIncome ? String(idea.projectedIncome) : "");
    setStatus((idea.status as Status) || "idea");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const payload = {
      idea_title: title.trim(),
      description: description.trim() || null,
      projected_monthly_income: projectedIncome ? Number(projectedIncome) : null,
      status,
    };
    const { error } = editingId
      ? await supabase.from("business_ideas").update(payload).eq("id", editingId).eq("user_id", user.id)
      : await supabase.from("business_ideas").insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Idea updated" : "Idea saved" });
    setDialogOpen(false);
    resetForm();
    onIdeaAdded?.();
  };

  const handleDelete = async () => {
    if (!deletingId || !user) return;
    const id = deletingId;
    setDeletingId(null);
    const { error } = await supabase.from("business_ideas").delete().eq("id", id).eq("user_id", user.id);
    if (error) return toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    toast({ title: "Idea deleted" });
    onIdeaAdded?.();
  };

  const handleStatusChange = async (idea: BusinessIdea, newStatus: Status) => {
    if (!user || newStatus === idea.status) return;
    const { error } = await supabase.from("business_ideas").update({ status: newStatus }).eq("id", idea.id).eq("user_id", user.id);
    if (error) return toast({ title: "Failed to update status", variant: "destructive" });
    onIdeaAdded?.();
  };

  const handleViabilityCheck = async (idea: BusinessIdea) => {
    if (!user) return;
    setCheckingId(idea.id);
    try {
      const { data, error } = await supabase.functions.invoke("idea-viability", { body: { ideaId: idea.id } });
      if (error) throw error;
      toast({
        title: `Viability score: ${data?.score ?? 0}/100`,
        description: data?.viability?.verdict || "Analysis saved.",
      });
      onIdeaAdded?.();
    } catch (e: any) {
      toast({ title: "Viability check failed", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setCheckingId(null);
    }
  };

  const addFromLibrary = async (lib: InformalIdea) => {
    if (!user) return;
    const projected = Math.round(usdToLocal((lib.estMonthlyIncomeUsd[0] + lib.estMonthlyIncomeUsd[1]) / 2));
    const { error } = await supabase.from("business_ideas").insert({
      user_id: user.id,
      idea_title: lib.title,
      description: `${lib.description}\n\nStartup: ${fmtMoney(usdToLocal(lib.startupCostUsd[0]))}–${fmtMoney(usdToLocal(lib.startupCostUsd[1]))}\nFirst income: ~${lib.timeToFirstIncomeDays} days`,
      projected_monthly_income: projected,
      status: "idea",
    });
    if (error) return toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
    toast({ title: "Added to your ideas" });
    setLibraryOpen(false);
    onIdeaAdded?.();
  };

  // ---------- Render ----------
  const renderIdeaCard = (idea: BusinessIdea, i: number) => {
    const isExpanded = expandedId === idea.id;
    const isChecking = checkingId === idea.id;
    const raw: any = (idea as any); // extended DB fields not on the typed BusinessIdea
    const vScore: number | null = raw.viability_score ?? null;
    const vNotes: ViabilityNotes | null = raw.viability_notes ?? null;

    // Gap coverage %
    const annualIncome = (idea.projectedIncome || 0) * 12;
    const coveragePct = annualGap > 0 ? Math.min(100, Math.round((annualIncome / annualGap) * 100)) : 0;

    return (
      <Card key={idea.id} className="shadow-warm overflow-hidden transition-all">
        <CardHeader className="cursor-pointer pb-2" onClick={() => setExpandedId(isExpanded ? null : idea.id)}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <span className="flex-shrink-0 w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-sm font-bold text-primary-foreground">{i + 1}</span>
              <div className="min-w-0">
                <CardTitle className="text-base leading-tight">{idea.title}</CardTitle>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={`text-xs ${statusColors[idea.status] || statusColors.idea}`}>{idea.status}</Badge>
                  {idea.projectedIncome > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {fmtMoney(idea.projectedIncome)}/mo
                    </span>
                  )}
                  {vScore !== null && (
                    <span className={`text-xs font-semibold flex items-center gap-1 ${scoreColor(vScore)}`}>
                      <ShieldCheck className="h-3 w-3" /> Viability {vScore}/100
                    </span>
                  )}
                  {annualGap > 0 && idea.projectedIncome > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Covers {coveragePct}% of gap
                    </span>
                  )}
                </div>
              </div>
            </div>
            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 space-y-4 animate-fade-up">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{idea.description || "No description provided."}</p>

            {annualGap > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Retirement-gap coverage (this idea)</span>
                  <span className="font-semibold">{coveragePct}%</span>
                </div>
                <Progress value={coveragePct} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">
                  {fmtMoney(annualIncome)} projected annual vs. {fmtMoney(annualGap)} annual gap
                </p>
              </div>
            )}

            {vNotes && (
              <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">AI viability check</p>
                  {vNotes.verdict && <Badge variant="outline" className="text-xs">{vNotes.verdict}</Badge>}
                </div>
                {typeof vNotes.realistic_monthly_income === "number" && (
                  <p className="text-xs text-muted-foreground">
                    Realistic monthly income: <span className="font-medium text-foreground">{fmtMoney(vNotes.realistic_monthly_income)}</span>
                  </p>
                )}
                {vNotes.strengths?.length ? (
                  <div>
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Strengths</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                      {vNotes.strengths.map((s, k) => <li key={k}>{s}</li>)}
                    </ul>
                  </div>
                ) : null}
                {vNotes.risks?.length ? (
                  <div>
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1"><AlertTriangle className="h-3 w-3 text-amber-600" /> Risks</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                      {vNotes.risks.map((s, k) => <li key={k}>{s}</li>)}
                    </ul>
                  </div>
                ) : null}
                {vNotes.next_steps?.length ? (
                  <div>
                    <p className="text-xs font-semibold mb-1">Next 30 days</p>
                    <ol className="text-xs text-muted-foreground list-decimal list-inside space-y-0.5">
                      {vNotes.next_steps.map((s, k) => <li key={k}>{s}</li>)}
                    </ol>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-xs text-muted-foreground">Status:</Label>
              <Select value={idea.status} onValueChange={(v) => handleStatusChange(idea, v as Status)}>
                <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="flex-1" onClick={() => handleViabilityCheck(idea)} disabled={isChecking}>
                {isChecking ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Sparkles className="h-4 w-4 me-2" />}
                {vScore !== null ? "Re-run viability check" : "Run viability check"}
              </Button>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => openEdit(idea)}>
                <Pencil className="h-4 w-4 me-1" /> Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingId(idea.id)}>
                <Trash2 className="h-4 w-4 me-1" /> Delete
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-heading font-bold">Income Reinvention</h2>
          <p className="text-sm text-muted-foreground">Score every idea against your retirement-income gap.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setLibraryOpen(true)}>
            <Library className="h-4 w-4 me-1" /> Idea library
          </Button>
          <Button size="sm" className="gradient-hero text-primary-foreground" onClick={openCreate}>
            <Plus className="h-4 w-4 me-1" /> Add idea
          </Button>
        </div>
      </div>

      {annualGap > 0 && (
        <Card className="shadow-warm border-primary/20">
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Your annual retirement-income gap</p>
            <p className="text-xl font-heading font-bold text-primary">{fmtMoney(annualGap)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Each idea below shows how much of this gap it would cover once launched.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit idea" : "Add income-reinvention idea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="idea-title">Title *</Label>
              <Input id="idea-title" placeholder="e.g. Weekday lunch kitchen" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idea-desc">Description</Label>
              <Textarea id="idea-desc" placeholder="Who's it for, how you'll deliver it, what it costs to start..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="idea-income">Projected income ({currency}/mo)</Label>
                <Input id="idea-income" type="number" inputMode="decimal" placeholder="0" value={projectedIncome} onChange={(e) => setProjectedIncome(e.target.value)} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {editingId ? "Save changes" : "Save idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Informal idea library */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informal-earner idea library</DialogTitle>
            <DialogDescription>
              {isInformal
                ? "Curated income paths that fit variable, cash-based earning. Tap to add to your list."
                : "Curated informal / side-hustle paths, filtered for your country. Tap to add to your list."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {libraryIdeas.map((lib, k) => (
              <Card key={k} className="border">
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{lib.title}</p>
                      <p className="text-xs text-muted-foreground">{lib.description}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addFromLibrary(lib)}>
                      <Plus className="h-3.5 w-3.5 me-1" /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>Est. income: {fmtMoney(usdToLocal(lib.estMonthlyIncomeUsd[0]))}–{fmtMoney(usdToLocal(lib.estMonthlyIncomeUsd[1]))}/mo</span>
                    <span>Startup: {fmtMoney(usdToLocal(lib.startupCostUsd[0]))}–{fmtMoney(usdToLocal(lib.startupCostUsd[1]))}</span>
                    <span>First income: ~{lib.timeToFirstIncomeDays}d</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {lib.tags.map(tag => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the idea. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {ideas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-muted-foreground" />
          <h3 className="font-heading font-semibold text-lg">No ideas yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add an income-reinvention idea, or start from the curated library.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea, i) => renderIdeaCard(idea, i))}
        </div>
      )}
    </div>
  );
};

export default IdeasTab;

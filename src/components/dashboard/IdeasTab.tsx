import { useState } from "react";
import { TrendingUp, FileText, ChevronDown, ChevronUp, Sparkles, FileX, Plus, Pencil, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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

const IdeasTab = ({ ideas, profile, onIdeaAdded }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
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
    toast({ title: editingId ? "Idea updated" : "Idea saved!" });
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

  const handleGenerateDeck = async (idea: BusinessIdea) => {
    if (!user) return;
    setGeneratingId(idea.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-deck", { body: { ideaId: idea.id } });
      if (error) throw error;
      if (data?.url) {
        toast({ title: "Deck ready 🎉", description: `${data.slides ?? 0} slides generated.` });
        window.open(data.url, "_blank", "noopener,noreferrer");
        onIdeaAdded?.();
      } else {
        throw new Error(data?.error || "No URL returned");
      }
    } catch (e: any) {
      toast({ title: "Couldn't generate deck", description: e?.message || "Try again.", variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-heading font-bold">My Business Ideas</h2>
          <p className="text-sm text-muted-foreground">Edit, track status, and generate AI pitch decks</p>
        </div>
        <Button size="sm" className="gradient-hero text-primary-foreground" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Add Idea
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Business Idea" : "Add Business Idea"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="idea-title">Title *</Label>
              <Input id="idea-title" placeholder="e.g. Online tutoring service" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idea-desc">Description</Label>
              <Textarea id="idea-desc" placeholder="Describe your business idea..." value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
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
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Save changes" : "Save idea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this idea?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the idea and its generated deck link. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            const isGenerating = generatingId === idea.id;
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
                          {idea.gammaDeckUrl && (
                            <span className="text-xs text-accent flex items-center gap-1"><FileText className="h-3 w-3" /> Deck ready</span>
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
                      <Button className="flex-1 gradient-gold text-secondary-foreground shadow-gold" onClick={() => handleGenerateDeck(idea)} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {idea.gammaDeckUrl ? "Regenerate deck" : "Generate pitch deck"}
                      </Button>
                      {idea.gammaDeckUrl && (
                        <Button variant="outline" className="flex-1" asChild>
                          <a href={idea.gammaDeckUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" /> Open deck
                          </a>
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(idea)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingId(idea.id)}>
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
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

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ListPlus, Plus, Target, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { safeErrorMessage } from "@/lib/safe-error";
import type { ProfileData } from "@/hooks/useDashboardData";

interface Props {
  profile: ProfileData | null;
}

interface Goal {
  id: string;
  title: string;
  category: string;
  target_amount: number | null;
  target_date: string | null;
  current_amount: number;
  notes: string | null;
  created_at: string;
}

/** Sub-step within a goal (additional to the goal's own target_date) */
interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  target_date: string | null;
  completed: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "savings", label: "Savings" },
  { value: "property", label: "Property" },
  { value: "investment", label: "Investment" },
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "business", label: "Business" },
  { value: "other", label: "Other" },
];

const GoalsSection = ({ profile }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [logGoal, setLogGoal] = useState<Goal | null>(null);
  const [logAmount, setLogAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // New-goal form
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");

  // Milestones (sub-steps) keyed by goal id
  const [milestones, setMilestones] = useState<Record<string, Milestone[]>>({});
  const [msGoal, setMsGoal] = useState<Goal | null>(null);
  const [msTitle, setMsTitle] = useState("");
  const [msDate, setMsDate] = useState("");

  const fmt = (n: number) => {
    try {
      return new Intl.NumberFormat(profile?.language || "en-US", {
        style: "currency",
        currency: profile?.currency || "USD",
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${profile?.currency || ""} ${n.toLocaleString()}`;
    }
  };

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("retirement_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load goals", description: safeErrorMessage(error), variant: "destructive" });
    } else if (data) {
      setGoals(data as Goal[]);
      await fetchMilestones((data as Goal[]).map((g) => g.id));
    }
    setLoading(false);
  };

  /** Load all milestones for the given goal ids and group them by goal */
  const fetchMilestones = async (goalIds: string[]) => {
    if (goalIds.length === 0) {
      setMilestones({});
      return;
    }
    const { data, error } = await (supabase as any)
      .from("goal_milestones")
      .select("*")
      .in("goal_id", goalIds)
      .order("created_at", { ascending: true });
    if (error || !data) return;
    const grouped: Record<string, Milestone[]> = {};
    (data as Milestone[]).forEach((m) => {
      grouped[m.goal_id] = [...(grouped[m.goal_id] || []), m];
    });
    setMilestones(grouped);
  };

  /** Create a milestone under the currently selected goal */
  const createMilestone = async () => {
    if (!msGoal || !msTitle.trim()) {
      toast({ title: "Milestone title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("goal_milestones")
      .insert({
        goal_id: msGoal.id,
        title: msTitle.trim().slice(0, 200),
        target_date: msDate || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't add milestone", description: safeErrorMessage(error), variant: "destructive" });
      return;
    }
    const m = data as Milestone;
    setMilestones((prev) => ({ ...prev, [m.goal_id]: [...(prev[m.goal_id] || []), m] }));
    setMsGoal(null); setMsTitle(""); setMsDate("");
    toast({ title: "Milestone added ✅" });
  };

  /** Toggle a milestone's completed state (optimistic) */
  const toggleMilestone = async (m: Milestone) => {
    const next = !m.completed;
    setMilestones((prev) => ({
      ...prev,
      [m.goal_id]: (prev[m.goal_id] || []).map((x) => (x.id === m.id ? { ...x, completed: next } : x)),
    }));
    const { error } = await (supabase as any)
      .from("goal_milestones")
      .update({ completed: next })
      .eq("id", m.id);
    if (error) {
      // revert on failure
      setMilestones((prev) => ({
        ...prev,
        [m.goal_id]: (prev[m.goal_id] || []).map((x) => (x.id === m.id ? { ...x, completed: m.completed } : x)),
      }));
      toast({ title: "Couldn't update milestone", description: safeErrorMessage(error), variant: "destructive" });
    }
  };


  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const resetNewForm = () => {
    setTitle(""); setCategory("savings"); setTargetAmount(""); setTargetDate(""); setNotes("");
  };

  const createGoal = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase as any)
      .from("retirement_goals")
      .insert({
        user_id: user.id,
        title: title.trim().slice(0, 200),
        category,
        target_amount: targetAmount ? Number(targetAmount) : null,
        target_date: targetDate || null,
        notes: notes.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save goal", description: safeErrorMessage(error), variant: "destructive" });
      return;
    }
    setGoals([data as Goal, ...goals]);
    resetNewForm();
    setOpenNew(false);
    toast({ title: "Goal added ✨" });
  };

  const logProgress = async () => {
    if (!logGoal) return;
    const amt = Number(logAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a positive amount", variant: "destructive" });
      return;
    }
    setSaving(true);
    const next = Number(logGoal.current_amount) + amt;
    const { error } = await (supabase as any)
      .from("retirement_goals")
      .update({ current_amount: next })
      .eq("id", logGoal.id);
    setSaving(false);
    if (error) {
      toast({ title: "Log failed", description: safeErrorMessage(error), variant: "destructive" });
      return;
    }
    setGoals(goals.map(g => g.id === logGoal.id ? { ...g, current_amount: next } : g));
    setLogGoal(null); setLogAmount("");
    toast({ title: "Progress logged 🎯" });
  };

  const deleteGoal = async (id: string) => {
    const { error } = await (supabase as any).from("retirement_goals").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", variant: "destructive" });
      return;
    }
    setGoals(goals.filter(g => g.id !== id));
  };

  const countdown = (dateStr: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return "Past due";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    if (years > 0) return `${years} year${years > 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""} away`;
    if (months > 0) return `${months} month${months > 1 ? "s" : ""} away`;
    return `${days} day${days !== 1 ? "s" : ""} away`;
  };

  const NewGoalDialog = (
    <Dialog open={openNew} onOpenChange={(o) => { setOpenNew(o); if (!o) resetNewForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New goal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New retirement goal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Buy family home, Emergency fund…" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Target amount ({profile?.currency || "USD"})</Label>
              <Input type="number" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Target date</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea maxLength={500} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this goal matters…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
          <Button onClick={createGoal} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />} Save goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-heading font-semibold flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" /> Goals
          </h3>
          <p className="text-xs text-muted-foreground">What you're actively building toward.</p>
        </div>
        {NewGoalDialog}
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : goals.length === 0 ? (
        <Card className="shadow-warm">
          <CardContent className="py-8 text-center space-y-3">
            <Target className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">Name what you are building toward.</p>
            <p className="text-xs text-muted-foreground">Set your first retirement goal.</p>
            <div className="pt-1">{NewGoalDialog}</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {goals.map(g => {
            const pct = g.target_amount && g.target_amount > 0
              ? Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100))
              : 0;
            const cd = countdown(g.target_date);
            return (
              <Card key={g.id} className="shadow-warm">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{g.title}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1 capitalize">
                        {g.category.replace("_", " ")}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteGoal(g.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>

                  {g.target_amount && g.target_amount > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{fmt(Number(g.current_amount))} of {fmt(Number(g.target_amount))}</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Logged: {fmt(Number(g.current_amount))}</p>
                  )}

                  {/* Milestone checklist (sub-steps within this goal) */}
                  {(milestones[g.id] || []).length > 0 && (
                    <ul className="space-y-1.5">
                      {(milestones[g.id] || []).map((m) => (
                        <li key={m.id} className="flex items-start gap-2">
                          <Checkbox
                            id={`ms-${m.id}`}
                            checked={m.completed}
                            onCheckedChange={() => toggleMilestone(m)}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`ms-${m.id}`}
                            className={`text-xs leading-snug cursor-pointer ${m.completed ? "line-through text-muted-foreground" : ""}`}
                          >
                            {m.title}
                            {m.target_date && (
                              <span className="text-[10px] text-muted-foreground ms-1">
                                · {new Date(m.target_date).toLocaleDateString(profile?.language || "en-US")}
                              </span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}

                  {cd && <p className="text-[11px] text-muted-foreground">🗓 {cd}</p>}
                  {g.notes && <p className="text-xs text-muted-foreground italic line-clamp-2">{g.notes}</p>}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setLogGoal(g); setLogAmount(""); }}>
                      Log progress
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 gap-1"
                      onClick={() => { setMsGoal(g); setMsTitle(""); setMsDate(""); }}
                    >
                      <ListPlus className="h-3.5 w-3.5" /> Add milestone
                    </Button>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!logGoal} onOpenChange={(o) => { if (!o) setLogGoal(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log progress: {logGoal?.title}</DialogTitle></DialogHeader>
          <div className="space-y-1.5">
            <Label>Amount to add ({profile?.currency || "USD"})</Label>
            <Input type="number" inputMode="decimal" value={logAmount} onChange={(e) => setLogAmount(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogGoal(null)}>Cancel</Button>
            <Button onClick={logProgress} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />} Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add-milestone dialog */}
      <Dialog open={!!msGoal} onOpenChange={(o) => { if (!o) { setMsGoal(null); setMsTitle(""); setMsDate(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add milestone: {msGoal?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Milestone *</Label>
              <Input maxLength={200} value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="Save first 25%, open savings account…" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Target date (optional)</Label>
              <Input type="date" value={msDate} onChange={(e) => setMsDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsGoal(null)}>Cancel</Button>
            <Button onClick={createMilestone} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />} Add milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoalsSection;

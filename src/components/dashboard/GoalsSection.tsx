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
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
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
    }
    setLoading(false);
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

                  {cd && <p className="text-[11px] text-muted-foreground">🗓 {cd}</p>}
                  {g.notes && <p className="text-xs text-muted-foreground italic line-clamp-2">{g.notes}</p>}

                  <Button size="sm" variant="outline" className="w-full" onClick={() => { setLogGoal(g); setLogAmount(""); }}>
                    Log progress
                  </Button>
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
    </div>
  );
};

export default GoalsSection;

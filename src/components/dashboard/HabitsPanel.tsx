import { useEffect, useMemo, useState } from "react";
import { Plus, Flame, Trash2, Check, Loader2, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Habit {
  id: string;
  title: string;
  description: string | null;
  target_per_week: number;
  created_at: string;
}

interface Completion {
  id: string;
  habit_id: string;
  completed_on: string; // YYYY-MM-DD
}

const todayStr = () => {
  const d = new Date();
  // Use local date to avoid timezone shifts
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Calculate current streak: count consecutive days ending today (or yesterday if not done today yet)
const calcStreak = (dates: Set<string>) => {
  let streak = 0;
  const today = todayStr();
  let cursor = new Date();
  // If not completed today, start checking from yesterday
  if (!dates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    if (dates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

const HabitsPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState(7);

  const fetchAll = async () => {
    if (!user) return;
    const [hRes, cRes] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", user.id)
        .gte("completed_on", daysAgo(120)),
    ]);
    if (hRes.data) setHabits(hRes.data as Habit[]);
    if (cRes.data) setCompletions(cRes.data as Completion[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    if (!user) return;
    const ch = supabase
      .channel(`habits-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${user.id}` },
        () => fetchAll()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_completions",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const completionsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    completions.forEach((c) => {
      if (!map.has(c.habit_id)) map.set(c.habit_id, new Set());
      map.get(c.habit_id)!.add(c.completed_on);
    });
    return map;
  }, [completions]);

  const addHabit = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("habits").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      target_per_week: target,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Habit created", description: "Start your streak today 🔥" });
    setTitle("");
    setDescription("");
    setTarget(7);
    setOpen(false);
  };

  const toggleToday = async (habit: Habit) => {
    if (!user) return;
    const today = todayStr();
    const done = completionsByHabit.get(habit.id)?.has(today);

    if (done) {
      // Remove today's completion
      const existing = completions.find(
        (c) => c.habit_id === habit.id && c.completed_on === today
      );
      if (!existing) return;
      setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      const { error } = await supabase.from("habit_completions").delete().eq("id", existing.id);
      if (error) {
        toast({ title: "Couldn't undo", description: error.message, variant: "destructive" });
        fetchAll();
      }
    } else {
      // Optimistic add
      const optimistic: Completion = {
        id: `temp-${Date.now()}`,
        habit_id: habit.id,
        completed_on: today,
      };
      setCompletions((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("habit_completions")
        .insert({ user_id: user.id, habit_id: habit.id, completed_on: today })
        .select()
        .single();
      if (error) {
        toast({ title: "Couldn't mark done", description: error.message, variant: "destructive" });
        setCompletions((prev) => prev.filter((c) => c.id !== optimistic.id));
      } else if (data) {
        setCompletions((prev) =>
          prev.map((c) => (c.id === optimistic.id ? (data as Completion) : c))
        );
      }
    }
  };

  const deleteHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      fetchAll();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-base">Daily habits</h3>
          <p className="text-xs text-muted-foreground">Build discipline one day at a time</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New habit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="e.g. Read 20 pages"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Why does this matter? (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Weekly target</label>
                  <span className="text-sm font-semibold text-primary">{target}× / week</span>
                </div>
                <Slider
                  value={[target]}
                  onValueChange={(v) => setTarget(v[0])}
                  min={1}
                  max={7}
                  step={1}
                />
              </div>
              <Button onClick={addHabit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create habit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : habits.length === 0 ? (
        <Card className="shadow-warm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No habits yet. Add one to start a streak 🔥
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const days = completionsByHabit.get(habit.id) || new Set<string>();
            const streak = calcStreak(days);
            const thisWeek = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
            const weekCount = thisWeek.filter((d) => days.has(d)).length;
            const doneToday = days.has(todayStr());

            return (
              <Card key={habit.id} className="shadow-warm">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary shrink-0" />
                        <h4 className="text-sm font-heading font-semibold truncate">
                          {habit.title}
                        </h4>
                      </div>
                      {habit.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {habit.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
                          streak > 0
                            ? "bg-gold-light text-gold-dark"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Flame className="h-3 w-3" />
                        {streak}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteHabit(habit.id)}
                        aria-label="Delete habit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* 7-day grid */}
                  <div className="flex items-center gap-1.5">
                    {thisWeek.map((d, i) => {
                      const isDone = days.has(d);
                      const isToday = d === todayStr();
                      const dayLabel = new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                        weekday: "narrow",
                      });
                      return (
                        <div key={d} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">{dayLabel}</span>
                          <div
                            className={cn(
                              "w-full aspect-square rounded-md flex items-center justify-center border transition-all",
                              isDone
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-muted/40 border-border",
                              isToday && !isDone && "border-primary border-dashed"
                            )}
                          >
                            {isDone && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {weekCount}/{habit.target_per_week} this week
                    </p>
                    <Button
                      size="sm"
                      variant={doneToday ? "secondary" : "default"}
                      onClick={() => toggleToday(habit)}
                      className="min-w-[120px]"
                    >
                      {doneToday ? (
                        <>
                          <Check className="h-4 w-4 mr-1" /> Done today
                        </>
                      ) : (
                        "Mark done today"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HabitsPanel;

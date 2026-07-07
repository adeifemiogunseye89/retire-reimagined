import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Circle, Loader2, CalendarDays, Flag, FileDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  notes: string | null;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
}

const priorityStyle: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-light text-accent",
  high: "bg-gold-light text-gold-dark",
};

const TasksPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const importFromReport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const { data: report, error: reportErr } = await supabase
        .from("ai_reports")
        .select("report_json, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (reportErr) throw reportErr;
      const steps: string[] = (report?.report_json as any)?.nextSteps || [];
      if (!steps.length) {
        toast({ title: "No report found", description: "Generate your readiness report first.", variant: "destructive" });
        return;
      }

      const { data: existing } = await supabase
        .from("tasks")
        .select("title")
        .eq("user_id", user.id);
      const existingTitles = new Set((existing || []).map((t: any) => (t.title || "").trim().toLowerCase()));

      const rows = steps
        .map((s) => String(s).trim())
        .filter((s) => s && !existingTitles.has(s.toLowerCase()))
        .slice(0, 8)
        .map((s) => ({
          user_id: user.id,
          title: s.slice(0, 200),
          notes: "From your readiness report",
          priority: "medium" as const,
        }));

      if (!rows.length) {
        toast({ title: "Already synced", description: "Every next-step is already a task." });
        return;
      }
      const { error: insertErr } = await supabase.from("tasks").insert(rows);
      if (insertErr) throw insertErr;
      toast({ title: `Imported ${rows.length} tasks`, description: "From your latest report" });
      fetchTasks();
    } catch (e) {
      toast({ title: "Import failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");

  const fetchTasks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Couldn't load tasks", description: error.message, variant: "destructive" });
    } else {
      setTasks((data || []) as Task[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();

    if (!user) return;
    const ch = supabase
      .channel(`tasks-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` },
        () => fetchTasks()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setPriority("medium");
    setDueDate("");
  };

  const addTask = async () => {
    if (!user || !title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: title.trim(),
      notes: notes.trim() || null,
      priority,
      due_date: dueDate || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Task added" });
    resetForm();
    setOpen(false);
  };

  const toggleTask = async (task: Task) => {
    const nextCompleted = !task.completed;
    // Optimistic
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completed: nextCompleted, completed_at: nextCompleted ? new Date().toISOString() : null }
          : t
      )
    );
    const { error } = await supabase
      .from("tasks")
      .update({
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      fetchTasks();
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      fetchTasks();
    }
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-base">Your tasks</h3>
          <p className="text-xs text-muted-foreground">
            {activeTasks.length} open · {doneTasks.length} done
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 me-1" /> Add task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="e.g. Research poultry feed suppliers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Priority</label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Due date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={addTask} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="shadow-warm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No tasks yet. Add your first one to start building momentum.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
          ))}
          {doneTasks.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-3 pb-1">Completed</p>
              {doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const TaskRow = ({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
}) => {
  const overdue =
    !task.completed && task.due_date && new Date(task.due_date) < new Date(new Date().toDateString());
  return (
    <Card className={cn("shadow-warm transition-opacity", task.completed && "opacity-60")}>
      <CardContent className="py-3 flex items-start gap-3">
        <button
          onClick={() => onToggle(task)}
          className={cn(
            "mt-0.5 h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
            task.completed
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3 opacity-0" />}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              task.completed && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </p>
          {task.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.notes}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge className={cn("text-[10px] px-1.5 py-0 h-4", priorityStyle[task.priority])}>
              <Flag className="h-2.5 w-2.5 me-0.5" /> {task.priority}
            </Badge>
            {task.due_date && (
              <span
                className={cn(
                  "text-[10px] flex items-center gap-1",
                  overdue ? "text-destructive font-medium" : "text-muted-foreground"
                )}
              >
                <CalendarDays className="h-2.5 w-2.5" />
                {new Date(task.due_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
                {overdue && " · overdue"}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default TasksPanel;

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Video, Plus, ExternalLink, Copy, Trash2, Calendar, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  scheduled_at: string;
  duration_minutes: number;
  room_url: string;
  room_name: string;
  status: string;
  attendee_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const defaultDateTime = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

const LiveSessionScheduler = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime());
  const [duration, setDuration] = useState(60);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .order("scheduled_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSessions((data || []) as Session[]);
  };

  useEffect(() => {
    if (open) fetchSessions();
  }, [open, user]);

  const { upcoming, live, past } = useMemo(() => {
    const now = Date.now();
    const u: Session[] = [], l: Session[] = [], p: Session[] = [];
    sessions.forEach((s) => {
      const start = new Date(s.scheduled_at).getTime();
      const end = start + s.duration_minutes * 60 * 1000;
      if (now < start) u.push(s);
      else if (now >= start && now <= end) l.push(s);
      else p.push(s);
    });
    u.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    return { upcoming: u, live: l, past: p };
  }, [sessions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setCreating(true);
    const roomName = `reignite-${crypto.randomUUID()}`;
    const room_url = `https://meet.jit.si/${roomName}`;
    const { error } = await supabase.from("live_sessions").insert({
      user_id: user.id,
      title: title.trim(),
      subject: subject.trim() || null,
      description: description.trim() || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
      room_url,
      room_name: roomName,
      status: "scheduled",
    });
    setCreating(false);
    if (error) {
      toast({ title: "Failed to schedule", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Session scheduled", description: "Share the invite link with your students." });
    setTitle(""); setSubject(""); setDescription(""); setScheduledAt(defaultDateTime()); setDuration(60);
    fetchSessions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("live_sessions").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    setSessions((s) => s.filter((x) => x.id !== id));
    toast({ title: "Session cancelled" });
  };

  const handleJoin = async (s: Session) => {
    window.open(s.room_url, "_blank", "noopener,noreferrer");
    await supabase
      .from("live_sessions")
      .update({ status: "live", attendee_count: s.attendee_count + 1 })
      .eq("id", s.id);
    fetchSessions();
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Invite link copied" });
  };

  const renderSession = (s: Session, kind: "upcoming" | "live" | "past") => (
    <Card key={s.id} className="shadow-warm">
      <CardContent className="py-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-heading font-semibold text-sm truncate">{s.title}</h4>
              {kind === "live" && <Badge className="bg-destructive text-destructive-foreground animate-pulse text-[10px]">LIVE</Badge>}
              {s.subject && <Badge variant="outline" className="text-[10px]">{s.subject}</Badge>}
            </div>
            {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(s.scheduled_at), "MMM d, p")}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes}m</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.attendee_count}</span>
              {kind === "upcoming" && <span>· starts {formatDistanceToNow(new Date(s.scheduled_at), { addSuffix: true })}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {kind !== "past" && (
            <Button size="sm" onClick={() => handleJoin(s)}>
              <Video className="h-3 w-3 me-1" /> Join
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleCopy(s.room_url)}>
            <Copy className="h-3 w-3 me-1" /> Invite link
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.open(s.room_url, "_blank")}>
            <ExternalLink className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive ms-auto" onClick={() => handleDelete(s.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-accent" /> Live Sessions
          </DialogTitle>
          <DialogDescription>
            Schedule and host live classes via Jitsi Meet — free, no signup required for students.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Schedule New Session
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ls-title" className="text-xs">Title *</Label>
              <Input id="ls-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="JAMB Biology Q&A" required />
            </div>
            <div>
              <Label htmlFor="ls-subject" className="text-xs">Subject</Label>
              <Input id="ls-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Biology" />
            </div>
            <div>
              <Label htmlFor="ls-duration" className="text-xs">Duration (min)</Label>
              <Input id="ls-duration" type="number" min={15} max={240} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ls-date" className="text-xs">Date & Time *</Label>
              <Input id="ls-date" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="ls-desc" className="text-xs">Description</Label>
              <Textarea id="ls-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What you'll cover..." rows={2} />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={creating || !title.trim()} className="w-full">
            {creating ? "Scheduling..." : "Schedule Session"}
          </Button>
        </form>

        <Tabs defaultValue="upcoming">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="live">Live ({live.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="space-y-2 mt-3">
            {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading...</p> :
              live.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No live sessions right now.</p> :
              live.map((s) => renderSession(s, "live"))}
          </TabsContent>
          <TabsContent value="upcoming" className="space-y-2 mt-3">
            {loading ? <p className="text-xs text-muted-foreground text-center py-4">Loading...</p> :
              upcoming.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Nothing scheduled. Create your first session above.</p> :
              upcoming.map((s) => renderSession(s, "upcoming"))}
          </TabsContent>
          <TabsContent value="past" className="space-y-2 mt-3">
            {past.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No past sessions yet.</p> :
              past.map((s) => renderSession(s, "past"))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LiveSessionScheduler;

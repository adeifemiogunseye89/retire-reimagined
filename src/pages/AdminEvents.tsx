import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  type: string | null;
  link: string | null;
  is_active: boolean | null;
}

const empty: Omit<EventRow, "id"> = {
  title: "", description: "", date: new Date().toISOString().slice(0, 16), type: "webinar", link: "", is_active: true,
};

const AdminEvents = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [draft, setDraft] = useState(empty);
  const [confirmDelete, setConfirmDelete] = useState<EventRow | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events_announcements")
      .select("*")
      .order("date", { ascending: false });
    setRows((data as EventRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const openNew = () => { setEditing(null); setDraft({ ...empty, date: new Date().toISOString().slice(0, 16) }); };
  const openEdit = (r: EventRow) => {
    setEditing(r);
    setDraft({
      title: r.title,
      description: r.description || "",
      date: new Date(r.date).toISOString().slice(0, 16),
      type: r.type || "webinar",
      link: r.link || "",
      is_active: r.is_active ?? true,
    });
  };

  const save = async () => {
    const payload = {
      title: draft.title,
      description: draft.description || null,
      date: new Date(draft.date).toISOString(),
      type: draft.type,
      link: draft.link || null,
      is_active: draft.is_active,
    };
    const { error } = editing
      ? await supabase.from("events_announcements").update(payload).eq("id", editing.id)
      : await supabase.from("events_announcements").insert(payload);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: t("admin.events.saved") });
    setEditing(null);
    setDraft(empty);
    load();
  };

  const remove = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from("events_announcements").delete().eq("id", confirmDelete.id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: t("admin.events.deleted") });
    setConfirmDelete(null);
    load();
  };

  const isOpen = editing !== null || (draft !== empty && draft.title !== "" && !editing) || false;
  const [showDialog, setShowDialog] = useState(false);
  useEffect(() => { setShowDialog(editing !== null); }, [editing]);

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("admin.events.noAccess")}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>{t("common.back")}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-4xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">{t("admin.events.title")}</h1>
            <p className="text-xs opacity-80">{t("admin.events.subtitle")}</p>
          </div>
          <Button onClick={() => { openNew(); setShowDialog(true); }} variant="secondary">
            <Plus className="h-4 w-4 mr-1" /> {t("admin.events.new")}
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">{t("admin.events.empty")}</CardContent></Card>
        ) : rows.map((r) => (
          <Card key={r.id} className="shadow-warm">
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {r.title}
                  {r.is_active ? <Badge variant="secondary">active</Badge> : <Badge variant="outline">hidden</Badge>}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(r.date).toLocaleString()} · {r.type}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => { openEdit(r); setShowDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </CardHeader>
            {r.description && <CardContent className="text-sm text-muted-foreground">{r.description}</CardContent>}
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t("common.edit") : t("admin.events.new")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("admin.events.form.title")}</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <Label>{t("admin.events.form.description")}</Label>
              <Textarea rows={3} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("admin.events.form.date")}</Label>
                <Input type="datetime-local" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </div>
              <div>
                <Label>{t("admin.events.form.type")}</Label>
                <Select value={draft.type ?? "webinar"} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="meetup">Meetup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("admin.events.form.link")}</Label>
              <Input value={draft.link ?? ""} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder="https://" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              <Label>{t("admin.events.form.active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={!draft.title.trim()}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.delete")}?</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDelete?.title}"</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>{t("common.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEvents;

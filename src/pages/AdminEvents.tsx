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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/regions";
import { SUPPORTED_LANGS } from "@/i18n";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  publish_at: string | null;
  type: string | null;
  link: string | null;
  is_active: boolean | null;
  target_countries: string[] | null;
  target_languages: string[] | null;
  target_roles: string[] | null;
}

const ROLES = ["admin", "moderator", "user"] as const;

const empty: Omit<EventRow, "id"> = {
  title: "",
  description: "",
  date: new Date().toISOString().slice(0, 16),
  publish_at: new Date().toISOString().slice(0, 16),
  type: "webinar",
  link: "",
  is_active: true,
  target_countries: [],
  target_languages: [],
  target_roles: [],
};

const AdminEvents = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [draft, setDraft] = useState<Omit<EventRow, "id">>(empty);
  const [confirmDelete, setConfirmDelete] = useState<EventRow | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("events_announcements")
      .select("*")
      .order("publish_at", { ascending: false, nullsFirst: false });
    setRows((data as EventRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const openNew = () => {
    setEditing(null);
    setDraft({ ...empty, date: new Date().toISOString().slice(0, 16), publish_at: new Date().toISOString().slice(0, 16) });
  };
  const openEdit = (r: EventRow) => {
    setEditing(r);
    setDraft({
      title: r.title,
      description: r.description || "",
      date: new Date(r.date).toISOString().slice(0, 16),
      publish_at: r.publish_at ? new Date(r.publish_at).toISOString().slice(0, 16) : new Date(r.date).toISOString().slice(0, 16),
      type: r.type || "webinar",
      link: r.link || "",
      is_active: r.is_active ?? true,
      target_countries: r.target_countries || [],
      target_languages: r.target_languages || [],
      target_roles: r.target_roles || [],
    });
  };

  const toggle = (list: string[] | null, value: string): string[] => {
    const cur = list || [];
    return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  };

  const save = async () => {
    const payload = {
      title: draft.title,
      description: draft.description || null,
      date: new Date(draft.date).toISOString(),
      publish_at: draft.publish_at ? new Date(draft.publish_at).toISOString() : null,
      type: draft.type,
      link: draft.link || null,
      is_active: draft.is_active,
      target_countries: draft.target_countries?.length ? draft.target_countries : null,
      target_languages: draft.target_languages?.length ? draft.target_languages : null,
      target_roles: draft.target_roles?.length ? draft.target_roles : null,
    };
    const { error } = editing
      ? await supabase.from("events_announcements").update(payload).eq("id", editing.id)
      : await supabase.from("events_announcements").insert(payload as any);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: t("admin.events.saved") });
    setShowDialog(false);
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
            <Plus className="h-4 w-4 me-1" /> {t("admin.events.new")}
          </Button>
        </div>
      </div>

      <div className="container max-w-4xl px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">{t("admin.events.empty")}</CardContent></Card>
        ) : rows.map((r) => {
          const scheduledFuture = r.publish_at && new Date(r.publish_at).getTime() > Date.now();
          const targeted = (r.target_countries?.length || 0) + (r.target_languages?.length || 0) + (r.target_roles?.length || 0) > 0;
          return (
            <Card key={r.id} className="shadow-warm">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {r.title}
                    {r.is_active ? <Badge variant="secondary">active</Badge> : <Badge variant="outline">hidden</Badge>}
                    {scheduledFuture && <Badge>{t("events.scheduled")}</Badge>}
                    {targeted && <Badge variant="outline">{t("events.targeted")}{r.target_countries?.length ? `: ${r.target_countries.join(", ")}` : ""}</Badge>}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(r.publish_at || r.date).toLocaleString()} · {r.type}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { openEdit(r); setShowDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              {r.description && <CardContent className="text-sm text-muted-foreground">{r.description}</CardContent>}
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                <Label>{t("admin.events.form.publishAt")}</Label>
                <Input type="datetime-local" value={draft.publish_at ?? ""} onChange={(e) => setDraft({ ...draft, publish_at: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label>{t("admin.events.form.link")}</Label>
                <Input value={draft.link ?? ""} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder="https://" />
              </div>
            </div>

            <div>
              <Label>{t("admin.events.form.targetCountries")}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {COUNTRIES.map((c) => {
                  const on = draft.target_countries?.includes(c.code);
                  return (
                    <button
                      type="button"
                      key={c.code}
                      onClick={() => setDraft({ ...draft, target_countries: toggle(draft.target_countries, c.code) })}
                      className={`text-xs px-2 py-1 rounded border ${on ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {c.flag} {c.code}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>{t("admin.events.form.targetLanguages")}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SUPPORTED_LANGS.map((l) => {
                  const on = draft.target_languages?.includes(l);
                  return (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setDraft({ ...draft, target_languages: toggle(draft.target_languages, l) })}
                      className={`text-xs px-2 py-1 rounded border ${on ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>{t("admin.events.form.targetRoles")}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLES.map((r) => {
                  const on = draft.target_roles?.includes(r);
                  return (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setDraft({ ...draft, target_roles: toggle(draft.target_roles, r) })}
                      className={`text-xs px-2 py-1 rounded border capitalize ${on ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
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

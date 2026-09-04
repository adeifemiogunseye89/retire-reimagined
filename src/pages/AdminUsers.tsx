import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, ShieldCheck, ShieldOff, UserPlus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface UserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  country: string | null;
  language: string | null;
  created_at: string | null;
  roles: string[];
}

type NewRole = "user" | "moderator" | "admin";

/** What each role can do — kept in sync with the RLS policies / admin RPCs. */
const PERMISSIONS: { role: NewRole; label: string; can: string[] }[] = [
  { role: "user", label: "User", can: ["Own dashboard, reports, goals and documents only"] },
  { role: "moderator", label: "Moderator", can: ["Everything a user can do", "Sees announcements targeted at moderators"] },
  {
    role: "admin",
    label: "Admin",
    can: [
      "Create accounts and grant/revoke roles",
      "Manage announcements and events",
      "View analytics, error tracking and usage observability",
    ],
  },
];

const AdminUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create-account dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", password: "", role: "admin" as NewRole });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users", {
      _limit: 100, _offset: 0, _search: search || null,
    });
    if (error) toast({ title: error.message, variant: "destructive" });
    setRows((data as UserRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(); /* eslint-disable-next-line */ }, [isAdmin]);

  const toggleRole = async (target: UserRow, role: "admin" | "moderator", grant: boolean) => {
    const { error } = await supabase.rpc("admin_set_role", {
      _target_user: target.user_id, _role: role, _grant: grant,
    });
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: t("admin.users.roleUpdated") });
    load();
  };

  /** Calls the admin-only edge function; `invite` sends an email instead of setting a password. */
  const createUser = async (invite: boolean) => {
    if (!form.email.trim()) return toast({ title: "Email is required", variant: "destructive" });
    if (!invite && form.password.length < 8) {
      return toast({ title: "Password must be at least 8 characters", variant: "destructive" });
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: invite ? undefined : form.password,
        role: form.role,
        invite,
      },
    });
    setCreating(false);
    const errMsg = error?.message || (data as { error?: string } | null)?.error;
    if (errMsg) return toast({ title: errMsg, variant: "destructive" });
    toast({ title: invite ? "Invite sent" : "Account created" });
    setCreateOpen(false);
    setForm({ email: "", full_name: "", password: "", role: "admin" });
    load();
  };

  if (roleLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">{t("admin.events.noAccess")}</p>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>{t("common.back")}</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-4xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold">{t("admin.users.title")}</h1>
            <p className="text-xs opacity-80">{t("admin.users.subtitle")}</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <UserPlus className="h-4 w-4 me-1" /> New account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create an account</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="new-email">Email</Label>
                  <Input id="new-email" type="email" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="person@example.com" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-name">Full name</Label>
                  <Input id="new-name" value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Optional" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-password">Temporary password</Label>
                  <Input id="new-password" type="password" value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="At least 8 characters" />
                  <p className="text-xs text-muted-foreground">
                    Leave blank and use “Send invite” to let them set their own password.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as NewRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" disabled={creating} onClick={() => createUser(true)}>
                  <Mail className="h-4 w-4 me-1" /> Send invite
                </Button>
                <Button disabled={creating} onClick={() => createUser(false)}>
                  {creating ? <Loader2 className="h-4 w-4 me-1 animate-spin" /> : <UserPlus className="h-4 w-4 me-1" />}
                  Create account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="container max-w-4xl px-4 py-6 space-y-3">
        <Card className="shadow-warm">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Roles & permissions</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {PERMISSIONS.map((p) => (
              <div key={p.role} className="rounded-lg border p-3 space-y-1">
                <Badge variant={p.role === "admin" ? "default" : "secondary"}>{p.label}</Badge>
                <ul className="text-xs text-muted-foreground list-disc ps-4 space-y-0.5">
                  {p.can.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Input
            placeholder={t("admin.users.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <Button onClick={load}>{t("common.search")}</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">{t("admin.users.empty")}</CardContent></Card>
        ) : rows.map((r) => {
          const isSelf = user?.id === r.user_id;
          const isAdminRow = r.roles.includes("admin");
          const isModRow = r.roles.includes("moderator");
          return (
            <Card key={r.user_id} className="shadow-warm">
              <CardContent className="py-4 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold">{r.full_name || "(no name)"} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                  <p className="text-xs text-muted-foreground">{r.email} · {r.country || "—"} · {r.language || "—"}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {r.roles.map((role) => <Badge key={role} variant={role === "admin" ? "default" : "secondary"} className="capitalize">{role}</Badge>)}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => toggleRole(r, "admin", !isAdminRow)} disabled={isSelf && isAdminRow}>
                    {isAdminRow ? <ShieldOff className="h-3 w-3 me-1" /> : <ShieldCheck className="h-3 w-3 me-1" />}
                    {isAdminRow ? t("admin.users.demoteAdmin") : t("admin.users.promoteAdmin")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleRole(r, "moderator", !isModRow)}>
                    {isModRow ? t("admin.users.demoteMod") : t("admin.users.promoteMod")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AdminUsers;

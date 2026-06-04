import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const AdminUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
        </div>
      </div>

      <div className="container max-w-4xl px-4 py-6 space-y-3">
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

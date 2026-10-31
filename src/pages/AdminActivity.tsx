/**
 * Admin Activity Log (/admin/activity).
 *
 * Event-level view of what each user actually did — sign-ins, dashboard tab
 * views, plan edits, profile updates, report generations, coach messages,
 * ideas, goals, tasks and document uploads — as recorded in `activity_log`
 * via src/lib/activity.ts. Complements /admin/observability (aggregate
 * counts) with an actionable, per-user event stream.
 *
 * Access: wrapped in ProtectedRoute + AdminRoute (server-backed has_role);
 * the RPC `admin_activity_log` is security-definer and only granted to
 * authenticated + service_role, with admin filtering enforced by RLS as well.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ScrollText, Search, User as UserIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ActivityRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  action: string;
  entity: string | null;
  detail: string | null;
  created_at: string;
}

/** Human labels + tone per action type. Unknown actions fall back to their raw key. */
const ACTION_META: Record<string, { label: string; className: string }> = {
  sign_in: { label: "Signed in", className: "bg-primary/10 text-primary border-primary/30" },
  sign_out: { label: "Signed out", className: "bg-muted text-muted-foreground border-border" },
  view_tab: { label: "Viewed tab", className: "bg-muted text-muted-foreground border-border" },
  plan_save: { label: "Plan edit", className: "bg-gold/15 text-gold-strong border-gold/40" },
  score_update: { label: "Score update", className: "bg-gold/15 text-gold-strong border-gold/40" },
  profile_update: { label: "Profile edit", className: "bg-gold/15 text-gold-strong border-gold/40" },
  generate_report: { label: "Report generated", className: "bg-primary/10 text-primary border-primary/30" },
  assessment_completed: { label: "Assessment completed", className: "bg-primary/10 text-primary border-primary/30" },
  coach_message: { label: "Coach AI message", className: "bg-blue-strong/10 text-blue-strong border-blue-strong/30" },
  idea_create: { label: "Idea created", className: "bg-primary/10 text-primary border-primary/30" },
  idea_update: { label: "Idea updated", className: "bg-muted text-muted-foreground border-border" },
  idea_delete: { label: "Idea deleted", className: "bg-destructive/10 text-destructive border-destructive/30" },
  idea_status_change: { label: "Idea status", className: "bg-muted text-muted-foreground border-border" },
  idea_viability_check: { label: "Viability check", className: "bg-blue-strong/10 text-blue-strong border-blue-strong/30" },
  goal_create: { label: "Goal created", className: "bg-primary/10 text-primary border-primary/30" },
  goal_progress: { label: "Goal progress", className: "bg-muted text-muted-foreground border-border" },
  goal_delete: { label: "Goal deleted", className: "bg-destructive/10 text-destructive border-destructive/30" },
  task_create: { label: "Task created", className: "bg-muted text-muted-foreground border-border" },
  task_complete: { label: "Task completed", className: "bg-primary/10 text-primary border-primary/30" },
  upload_document: { label: "Document uploaded", className: "bg-blue-strong/10 text-blue-strong border-blue-strong/30" },
  pension_data_confirmed: { label: "Pension data confirmed", className: "bg-primary/10 text-primary border-primary/30" },
};

const PAGE_SIZE = 100;

const AdminActivity = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (currentOffset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_activity_log", {
        _days: days,
        _search: search || null,
        _limit: PAGE_SIZE,
        _offset: currentOffset,
      });
      if (error) throw error;
      const page = (data as unknown as ActivityRow[]) || [];
      setRows((prev) => (append ? [...prev, ...page] : page));
      setHasMore(page.length === PAGE_SIZE);
      setOffset(currentOffset);
    } catch (e) {
      console.error("admin_activity_log failed", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [days, search]);

  // Refetch whenever the range or search term changes.
  useEffect(() => {
    if (isAdmin) fetchPage(0, false);
  }, [isAdmin, fetchPage]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Admin access required.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back</Button>
      </div>
    );
  }

  const submitSearch = () => setSearch(searchInput.trim());
  const clearSearch = () => { setSearchInput(""); setSearch(""); };
  const filterByUser = (row: ActivityRow) => {
    setSearchInput(row.email || "");
    setSearch(row.email || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="gradient-hero text-primary-foreground py-4">
        <div className="container max-w-5xl px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-heading font-bold flex items-center gap-2">
              <ScrollText className="h-5 w-5" /> Activity Log
            </h1>
            <p className="text-xs opacity-80">Sign-ins, dashboard actions and plan edits — per user</p>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-primary-foreground/10 text-primary-foreground text-sm px-2 py-1 rounded border border-primary-foreground/20"
          >
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7d</option>
            <option value={30}>Last 30d</option>
          </select>
        </div>
      </div>

      <div className="container max-w-5xl px-4 py-6 space-y-4">
        {/* Search: email, name, action or entity */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="Search by user email, name or action…"
              className="pl-9 pr-9 bg-background"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button onClick={submitSearch}>Search</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center">
                <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet for this period.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {rows.map((row) => {
                  const meta = ACTION_META[row.action] || { label: row.action, className: "bg-muted text-muted-foreground border-border" };
                  return (
                    <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap pt-1 w-28 shrink-0">
                        {formatTime(row.created_at)}
                      </span>
                      <button
                        onClick={() => filterByUser(row)}
                        className="text-left min-w-0 shrink-0 max-w-[220px] group"
                        title="Filter by this user"
                      >
                        <span className="text-sm font-medium truncate block group-hover:underline">
                          {row.full_name || row.email || "Unknown user"}
                        </span>
                        {row.full_name && row.email && (
                          <span className="text-[11px] text-muted-foreground truncate block">{row.email}</span>
                        )}
                      </button>
                      <Badge variant="outline" className={`shrink-0 text-[11px] ${meta.className}`}>
                        {meta.label}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        {row.entity && (
                          <p className="text-sm truncate">{row.entity}</p>
                        )}
                        {row.detail && (
                          <p className="text-xs text-muted-foreground truncate">{row.detail}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {hasMore && !loading && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => fetchPage(offset + PAGE_SIZE, true)} disabled={loadingMore}>
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Load more
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
          <UserIcon className="h-3 w-3" /> Click a user's name to see only their activity.
        </p>
      </div>
    </div>
  );
};

export default AdminActivity;

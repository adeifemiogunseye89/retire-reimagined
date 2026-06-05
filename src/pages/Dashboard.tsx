import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, FileText, Lightbulb, Zap, BarChart3, ShieldCheck, LogOut, Menu, X, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { localeToLang } from "@/i18n";
import HomeTab from "@/components/dashboard/HomeTab";
import ReportTab from "@/components/dashboard/ReportTab";
import IdeasTab from "@/components/dashboard/IdeasTab";
import ProductivityTab from "@/components/dashboard/ProductivityTab";
import MetricsTab from "@/components/dashboard/MetricsTab";
import PlanProtectTab from "@/components/dashboard/PlanProtectTab";

type TabId = "home" | "report" | "ideas" | "plan" | "productivity" | "metrics";

const TAB_ICONS: Record<TabId, typeof Home> = {
  home: Home, report: FileText, ideas: Lightbulb, plan: ShieldCheck, productivity: Zap, metrics: BarChart3,
};
const TAB_KEYS: Record<TabId, string> = {
  home: "nav.home", report: "nav.report", ideas: "nav.ideas",
  plan: "nav.plan", productivity: "nav.hub", metrics: "nav.metrics",
};
const TAB_ORDER: TabId[] = ["home","report","ideas","plan","productivity","metrics"];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const data = useDashboardData();

  // Sync i18n language from the user's profile preference
  useEffect(() => {
    const lang = localeToLang((data.profile as any)?.language);
    if (lang && i18n.language !== lang) i18n.changeLanguage(lang);
  }, [data.profile, i18n]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (data.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayName = data.profile?.fullName?.split(" ")[1] || t("dashboard.fallbackName");

  const renderTab = () => {
    switch (activeTab) {
      case "home": return <HomeTab profile={data.profile} report={data.report} metrics={data.metrics} events={data.events} />;
      case "report": return <ReportTab profile={data.profile} report={data.report} />;
      case "ideas": return <IdeasTab ideas={data.ideas} profile={data.profile} onIdeaAdded={data.refetchIdeas} />;
      case "plan": return <PlanProtectTab profile={data.profile} report={data.report} ideas={data.ideas} savingsPlan={data.savingsPlan} savingsPlanUpdatedAt={data.savingsPlanUpdatedAt} onPlanSaved={data.refetchSavingsPlan} />;
      case "productivity": return <ProductivityTab />;
      case "metrics": return <MetricsTab metrics={data.metrics} profile={data.profile} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-4 border-b border-sidebar-border">
          <h1 className="text-lg font-heading font-bold flex items-center gap-2">
            🔥 <span className="text-sidebar-primary">Reignite</span>
          </h1>
          <p className="text-xs mt-1 opacity-70">{data.profile?.fullName}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {TAB_ORDER.map((id) => {
            const Icon = TAB_ICONS[id];
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(TAB_KEYS[id])}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {isAdmin && (
            <div className="pb-1">
              <p className="px-3 text-[10px] uppercase tracking-wide opacity-60 mb-1">{t("nav.admin")}</p>
              <button onClick={() => navigate("/admin/events")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
                <Shield className="h-4 w-4" /> {t("nav.adminEvents")}
              </button>
              <button onClick={() => navigate("/admin/users")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
                <Shield className="h-4 w-4" /> {t("nav.adminUsers")}
              </button>
              <button onClick={() => navigate("/admin/analytics")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors">
                <Shield className="h-4 w-4" /> {t("nav.adminAnalytics")}
              </button>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> {t("common.signOut")}
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col animate-slide-in">
            <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
              <h1 className="text-lg font-heading font-bold">🔥 <span className="text-sidebar-primary">Reignite</span></h1>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {TAB_ORDER.map((id) => {
                const Icon = TAB_ICONS[id];
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === id ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(TAB_KEYS[id])}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-sm font-heading font-semibold">
                {t("dashboard.welcomeBack", { name: displayName })}
              </h2>
              <p className="text-xs text-muted-foreground">{data.profile?.sector} • {data.profile?.gradeLevel}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/profile")}
            title={t("dashboard.editProfile")}
            className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold hover:ring-2 hover:ring-primary/40 transition"
          >
            {data.profile?.fullName?.charAt(0) || "U"}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          <div className="max-w-3xl mx-auto">
            {renderTab()}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-40">
          <div className="flex items-center justify-around py-2">
            {TAB_ORDER.map((id) => {
              const Icon = TAB_ICONS[id];
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors ${
                    activeTab === id ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{t(TAB_KEYS[id])}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;

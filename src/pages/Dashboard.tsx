import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home, FileText, Lightbulb, Zap, BarChart3, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockUser } from "@/lib/mock-data";
import HomeTab from "@/components/dashboard/HomeTab";
import ReportTab from "@/components/dashboard/ReportTab";
import IdeasTab from "@/components/dashboard/IdeasTab";
import ProductivityTab from "@/components/dashboard/ProductivityTab";
import MetricsTab from "@/components/dashboard/MetricsTab";

/**
 * Main dashboard with mobile bottom nav and desktop sidebar.
 * Contains all five tab views: Home, Report, Ideas, Productivity, Metrics.
 */
type TabId = "home" | "report" | "ideas" | "productivity" | "metrics";

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "report", label: "Report", icon: FileText },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "productivity", label: "Hub", icon: Zap },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const renderTab = () => {
    switch (activeTab) {
      case "home": return <HomeTab />;
      case "report": return <ReportTab />;
      case "ideas": return <IdeasTab />;
      case "productivity": return <ProductivityTab />;
      case "metrics": return <MetricsTab />;
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
          <p className="text-xs mt-1 opacity-70">{mockUser.fullName}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
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
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-sm font-heading font-semibold">
                Welcome back, {mockUser.fullName.split(" ")[1]} 👋
              </h2>
              <p className="text-xs text-muted-foreground">{mockUser.sector} • {mockUser.gradeLevel}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold">
            {mockUser.fullName.charAt(0)}
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">
          <div className="max-w-3xl mx-auto">
            {renderTab()}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-40">
          <div className="flex items-center justify-around py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Dashboard;

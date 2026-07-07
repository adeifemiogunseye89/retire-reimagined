import { CheckSquare, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TasksPanel from "./TasksPanel";
import HabitsPanel from "./HabitsPanel";

/**
 * Productivity hub — Tasks + Habits only.
 * Habits can be AI-seeded from the user's profile; tasks can auto-sync
 * from the latest report's next-steps.
 */
const ProductivityTab = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-heading font-bold">{t("dashboard.productivity.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("dashboard.productivity.subtitle")}</p>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{t("dashboard.productivity.tabs.tasks", "Tasks")}</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span>{t("dashboard.productivity.tabs.habits", "Habits")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TasksPanel />
        </TabsContent>

        <TabsContent value="habits">
          <HabitsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductivityTab;

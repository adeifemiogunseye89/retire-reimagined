import { useState } from "react";
import { BookOpen, Video, Users, Sparkles, FileText, GraduationCap, CheckSquare, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TasksPanel from "./TasksPanel";
import HabitsPanel from "./HabitsPanel";
import WorksheetGenerator from "./WorksheetGenerator";
import LessonGenerator from "./LessonGenerator";
import LiveSessionScheduler from "./LiveSessionScheduler";

/**
 * Productivity hub with Tasks, Habits, and Teaching tools.
 */
const ProductivityTab = () => {
  const { t } = useTranslation();
  const [worksheetOpen, setWorksheetOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);

  const quickActions = [
    {
      icon: BookOpen,
      title: t("dashboard.productivity.actions.lessonTitle"),
      description: t("dashboard.productivity.actions.lessonDesc"),
      color: "bg-green-light",
      iconColor: "text-primary",
      onClick: () => setLessonOpen(true),
      comingSoon: false,
    },
    {
      icon: Video,
      title: t("dashboard.productivity.actions.liveTitle"),
      description: t("dashboard.productivity.actions.liveDesc"),
      color: "bg-blue-light",
      iconColor: "text-accent",
      onClick: () => setLiveOpen(true),
      comingSoon: false,
    },
    {
      icon: FileText,
      title: t("dashboard.productivity.actions.worksheetTitle"),
      description: t("dashboard.productivity.actions.worksheetDesc"),
      color: "bg-muted",
      iconColor: "text-secondary",
      onClick: () => setWorksheetOpen(true),
      comingSoon: false,
    },
  ];

  const templates = [
    { title: "JAMB Biology Crash Course", lessons: 12, enrolled: 45 },
    { title: "SSCE Chemistry Prep", lessons: 8, enrolled: 32 },
    { title: "Practical Science Kit Guide", lessons: 6, enrolled: 18 },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-xl font-heading font-bold">{t("dashboard.productivity.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("dashboard.productivity.subtitle")}</p>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("dashboard.productivity.tabs.tasks")}</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("dashboard.productivity.tabs.habits")}</span>
          </TabsTrigger>
          <TabsTrigger value="teach" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("dashboard.productivity.tabs.teach")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <TasksPanel />
        </TabsContent>

        <TabsContent value="habits">
          <HabitsPanel />
        </TabsContent>

        <TabsContent value="teach" className="space-y-6">
          {/* Quick Actions */}
          <div className="grid gap-4">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className={`shadow-warm transition-shadow ${action.comingSoon ? "opacity-60" : "cursor-pointer hover:shadow-lg"}`}
                onClick={action.comingSoon ? undefined : action.onClick}
              >
                <CardContent className="py-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${action.color}`}>
                    <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-heading font-semibold flex items-center gap-2">
                      {action.title}
                      {action.comingSoon && (
                        <Badge variant="outline" className="text-[10px]">{t("common.comingSoon")}</Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={action.comingSoon}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                  >
                    <Sparkles className="h-3 w-3 me-1" /> {t("dashboard.productivity.actions.start")}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* E-Learning Templates */}
          <div>
            <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> {t("dashboard.productivity.courses")}
            </h3>
            <div className="grid gap-3">
              {templates.map((tpl) => (
                <Card key={tpl.title} className="shadow-warm">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-heading font-semibold truncate">{tpl.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{t("dashboard.productivity.courseMeta", { lessons: tpl.lessons })}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {t("dashboard.productivity.students", { count: tpl.enrolled })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{t("dashboard.productivity.active")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Micro-School CTA */}
          <Card className="gradient-hero text-primary-foreground shadow-warm">
            <CardContent className="py-6 text-center space-y-3">
              <GraduationCap className="h-10 w-10 mx-auto opacity-90" />
              <h3 className="font-heading font-bold text-lg">{t("dashboard.productivity.microSchool.title")}</h3>
              <p className="text-sm opacity-90">
                {t("dashboard.productivity.microSchool.subtitle")}
              </p>
              <Button variant="secondary" size="sm" className="shadow-gold">
                {t("dashboard.productivity.microSchool.cta")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WorksheetGenerator open={worksheetOpen} onOpenChange={setWorksheetOpen} />
      <LessonGenerator open={lessonOpen} onOpenChange={setLessonOpen} />
      <LiveSessionScheduler open={liveOpen} onOpenChange={setLiveOpen} />
    </div>
  );
};

export default ProductivityTab;

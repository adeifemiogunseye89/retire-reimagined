import { BookOpen, Video, Users, Sparkles, FileText, GraduationCap, CheckSquare, Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TasksPanel from "./TasksPanel";
import HabitsPanel from "./HabitsPanel";

/**
 * Productivity hub with Tasks, Habits, and Teaching tools.
 */
const ProductivityTab = () => {
  const quickActions = [
    {
      icon: BookOpen,
      title: "Create Recorded Lesson",
      description: "AI generates lesson content, quizzes, and worksheets from your topic",
      color: "bg-green-light",
      iconColor: "text-primary",
    },
    {
      icon: Video,
      title: "Launch Live Session",
      description: "Start a live teaching session with AI-assisted student feedback",
      color: "bg-blue-light",
      iconColor: "text-accent",
    },
    {
      icon: FileText,
      title: "Generate Worksheet",
      description: "Create printable or digital worksheets for any subject and level",
      color: "bg-muted",
      iconColor: "text-secondary",
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
        <h2 className="text-xl font-heading font-bold">Productivity Hub</h2>
        <p className="text-sm text-muted-foreground">Plan, build habits, and teach with AI</p>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tasks</span>
          </TabsTrigger>
          <TabsTrigger value="habits" className="gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Habits</span>
          </TabsTrigger>
          <TabsTrigger value="teach" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Teach</span>
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
              <Card key={action.title} className="shadow-warm cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${action.color}`}>
                    <action.icon className={`h-6 w-6 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-heading font-semibold">{action.title}</h3>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <Button size="sm">
                    <Sparkles className="h-3 w-3 mr-1" /> Start
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* E-Learning Templates */}
          <div>
            <h3 className="text-sm font-heading font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> Your E-Learning Courses
            </h3>
            <div className="grid gap-3">
              {templates.map((tpl) => (
                <Card key={tpl.title} className="shadow-warm">
                  <CardContent className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-heading font-semibold truncate">{tpl.title}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{tpl.lessons} lessons</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {tpl.enrolled} students
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Micro-School CTA */}
          <Card className="gradient-hero text-primary-foreground shadow-warm">
            <CardContent className="py-6 text-center space-y-3">
              <GraduationCap className="h-10 w-10 mx-auto opacity-90" />
              <h3 className="font-heading font-bold text-lg">Launch Your AI Micro-School</h3>
              <p className="text-sm opacity-90">
                Get ready-made templates: subscription setup, marketing copy, pricing, and student management.
              </p>
              <Button variant="secondary" size="sm" className="shadow-gold">
                Get Started Free
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductivityTab;

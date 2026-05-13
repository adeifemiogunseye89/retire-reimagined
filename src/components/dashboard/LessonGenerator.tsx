import { useEffect, useState } from "react";
import { Loader2, Sparkles, BookOpen, Trash2, Eye, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface LessonSection {
  heading: string;
  body: string;
}

interface Lesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  grade_level: string | null;
  duration_minutes: number;
  summary: string | null;
  sections: LessonSection[];
  quiz: QuizQuestion[];
  video_url: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LessonGenerator = ({ open, onOpenChange }: Props) => {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [duration, setDuration] = useState("30");
  const [videoUrl, setVideoUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [preview, setPreview] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const loadLessons = async () => {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error(error);
      return;
    }
    setLessons((data ?? []) as unknown as Lesson[]);
  };

  useEffect(() => {
    if (open) loadLessons();
  }, [open]);

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim()) {
      toast({ title: "Missing details", description: "Subject and topic are required." });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson", {
        body: { subject, topic, gradeLevel, duration, videoUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Lesson created", description: data.lesson.title });
      setSubject("");
      setTopic("");
      setVideoUrl("");
      await loadLessons();
      openPreview(data.lesson as Lesson);
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setLessons((prev) => prev.filter((l) => l.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  const openPreview = (lesson: Lesson) => {
    setPreview(lesson);
    setAnswers({});
    setShowResults(false);
  };

  const score = preview
    ? preview.quiz.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {preview ? preview.title : "Create Recorded Lesson"}
          </DialogTitle>
          <DialogDescription>
            {preview
              ? `${preview.subject} • ${preview.topic} • ${preview.duration_minutes} min`
              : "AI generates structured lesson sections plus a 5-question quiz."}
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-5">
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                ← Back to generator
              </Button>

              {preview.summary && (
                <p className="text-sm text-muted-foreground italic">{preview.summary}</p>
              )}

              {preview.video_url && (
                <a
                  href={preview.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent underline"
                >
                  Watch attached video →
                </a>
              )}

              <div className="space-y-4">
                {preview.sections.map((s, i) => (
                  <div key={i}>
                    <h4 className="font-heading font-semibold text-sm mb-1">
                      {i + 1}. {s.heading}
                    </h4>
                    <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                      {s.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-semibold text-sm">Comprehension Quiz</h4>
                  {showResults && (
                    <Badge variant="secondary">
                      Score: {score} / {preview.quiz.length}
                    </Badge>
                  )}
                </div>
                {preview.quiz.map((q, qi) => (
                  <div key={qi} className="space-y-2">
                    <p className="text-sm font-medium">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="grid gap-1.5">
                      {q.options.map((opt, oi) => {
                        const selected = answers[qi] === oi;
                        const correct = q.correct_index === oi;
                        const showState = showResults;
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={showResults}
                            onClick={() => setAnswers((p) => ({ ...p, [qi]: oi }))}
                            className={`text-left text-xs px-3 py-2 rounded-md border transition ${
                              showState && correct
                                ? "border-primary bg-primary/10"
                                : showState && selected && !correct
                                ? "border-destructive bg-destructive/10"
                                : selected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {showState && correct && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              )}
                              {showState && selected && !correct && (
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                              )}
                              {opt}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {showResults && (
                      <p className="text-xs text-muted-foreground italic pl-2">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
                {!showResults ? (
                  <Button
                    size="sm"
                    onClick={() => setShowResults(true)}
                    disabled={Object.keys(answers).length < preview.quiz.length}
                    className="w-full"
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAnswers({});
                      setShowResults(false);
                    }}
                    className="w-full"
                  >
                    Retake
                  </Button>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="subj">Subject *</Label>
                  <Input
                    id="subj"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Biology"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grade">Grade Level</Label>
                  <Input
                    id="grade"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. SS2 / JAMB"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="topic">Topic *</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis: light & dark reactions"
                  rows={2}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Target Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="video">Video URL (optional)</Label>
                  <Input
                    id="video"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="YouTube / Loom link"
                  />
                </div>
              </div>

              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating lesson...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate Lesson
                  </>
                )}
              </Button>

              {lessons.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Your Lessons
                  </p>
                  <div className="grid gap-2">
                    {lessons.map((l) => (
                      <Card key={l.id} className="shadow-sm">
                        <CardContent className="py-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-semibold truncate">{l.title}</h5>
                            <p className="text-xs text-muted-foreground truncate">
                              {l.subject} • {l.topic} • {l.quiz?.length ?? 0} quiz Qs
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => openPreview(l)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(l.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LessonGenerator;

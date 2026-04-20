import { useEffect, useState } from "react";
import { FileText, Sparkles, Download, Loader2, Trash2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useAuth } from "@/contexts/AuthContext";
import { downloadWorksheetPDF, type WorksheetData } from "@/lib/worksheet-pdf";

interface WorksheetRow extends WorksheetData {
  id: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WorksheetGenerator = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState("10");
  const [generating, setGenerating] = useState(false);
  const [worksheets, setWorksheets] = useState<WorksheetRow[]>([]);
  const [preview, setPreview] = useState<WorksheetRow | null>(null);

  const loadWorksheets = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("worksheets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return;
    }
    setWorksheets((data ?? []) as unknown as WorksheetRow[]);
  };

  useEffect(() => {
    if (open) loadWorksheets();
  }, [open, user]);

  // Realtime sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("worksheets-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "worksheets", filter: `user_id=eq.${user.id}` },
        () => loadWorksheets(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim()) {
      toast({ title: "Missing details", description: "Subject and topic are required.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-worksheet", {
        body: {
          subject: subject.trim(),
          topic: topic.trim(),
          gradeLevel: gradeLevel.trim(),
          difficulty,
          questionCount: parseInt(questionCount, 10),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const worksheet = (data as any).worksheet as WorksheetRow;
      toast({ title: "Worksheet ready!", description: `${worksheet.title} generated successfully.` });
      setSubject("");
      setTopic("");
      setGradeLevel("");
      // Auto-download the PDF
      downloadWorksheetPDF(worksheet);
      await loadWorksheets();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Generation failed";
      toast({
        title: "Could not generate worksheet",
        description: msg.includes("Rate limit")
          ? "Rate limit reached — try again in a minute."
          : msg.includes("credits")
            ? "AI credits exhausted. Top up in Settings → Workspace → Usage."
            : msg,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("worksheets").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Worksheet deleted" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              <FileText className="h-5 w-5 text-primary" /> Generate Worksheet
            </DialogTitle>
            <DialogDescription>
              AI creates a printable worksheet with answer key. Designed for the Nigerian curriculum.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ws-subject">Subject *</Label>
                  <Input
                    id="ws-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Biology"
                    disabled={generating}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ws-grade">Grade level</Label>
                  <Input
                    id="ws-grade"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. SS2 / JAMB / Primary 5"
                    disabled={generating}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ws-topic">Topic *</Label>
                <Textarea
                  id="ws-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis — light and dark reactions"
                  rows={2}
                  disabled={generating}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty} disabled={generating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Questions</Label>
                  <Select value={questionCount} onValueChange={setQuestionCount} disabled={generating}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 8, 10, 12, 15, 20].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
                size="lg"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating worksheet…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generate & Download PDF</>
                )}
              </Button>

              {worksheets.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-heading font-semibold mb-2 text-muted-foreground">
                    Your Worksheets ({worksheets.length})
                  </h4>
                  <div className="space-y-2">
                    {worksheets.map((w) => (
                      <Card key={w.id} className="shadow-sm">
                        <CardContent className="py-3 px-3 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-semibold truncate">{w.title}</h5>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] capitalize">{w.subject}</Badge>
                              <Badge variant="outline" className="text-[10px] capitalize">{w.difficulty}</Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {w.questions?.length ?? 0} questions
                              </span>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => setPreview(w)} aria-label="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => downloadWorksheetPDF(w)} aria-label="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(w.id)} aria-label="Delete">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading">{preview?.title}</DialogTitle>
            <DialogDescription>
              {preview?.subject} • {preview?.topic} {preview?.grade_level && `• ${preview.grade_level}`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-2">
              {preview?.instructions && (
                <p className="text-sm text-muted-foreground italic">{preview.instructions}</p>
              )}
              {preview?.questions?.map((q) => (
                <div key={q.number} className="space-y-1">
                  <p className="text-sm font-semibold">{q.number}. {q.question}</p>
                  {q.type === "multiple_choice" && q.options && (
                    <ul className="text-sm ml-4 space-y-0.5">
                      {q.options.map((o, i) => (
                        <li key={i}>{String.fromCharCode(65 + i)}. {o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {preview?.answer_key && preview.answer_key.length > 0 && (
                <div className="pt-3 border-t">
                  <h4 className="text-sm font-heading font-semibold mb-2 text-secondary">Answer Key</h4>
                  <ol className="text-xs space-y-1">
                    {preview.answer_key.map((a) => (
                      <li key={a.number}><strong>{a.number}.</strong> {a.answer}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            {preview && (
              <Button onClick={() => downloadWorksheetPDF(preview)}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorksheetGenerator;

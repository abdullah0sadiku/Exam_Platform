"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Eye, Share2, EyeOff, Trash2, Plus, Copy, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, Loader2
} from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string | string[];
  explanation?: string | null;
  difficulty: string;
  topicTag?: string | null;
  sourceReference?: string | null;
  points: number;
  orderIndex: number;
}

interface Exam {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  status: string;
  sourceType: string;
  durationMinutes?: number | null;
  passingScore: number;
  showResultsImmediately: boolean;
  showExplanations: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  allowRetake: boolean;
  requireNameEmail: boolean;
  totalPoints: number;
  questions: Question[];
  shareLinks: { token: string }[];
  _count: { attempts: number };
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  MULTIPLE_SELECT: "Multiple select",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
  OPEN_ENDED: "Open ended",
  FILL_IN_BLANK: "Fill in blank",
};

export function ExamEditor({ exam: initialExam }: { exam: Exam }) {
  const router = useRouter();
  const [exam, setExam] = useState(initialExam);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: exam.title,
          description: exam.description,
          instructions: exam.instructions,
          durationMinutes: exam.durationMinutes,
          passingScore: exam.passingScore,
          showResultsImmediately: exam.showResultsImmediately,
          showExplanations: exam.showExplanations,
          shuffleQuestions: exam.shuffleQuestions,
          shuffleAnswers: exam.shuffleAnswers,
          allowRetake: exam.allowRetake,
          requireNameEmail: exam.requireNameEmail,
        }),
      });
      if (res.ok) showToast("success", "Saved");
      else showToast("error", "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    setPublishing(true);
    try {
      const method = exam.status === "PUBLISHED" ? "DELETE" : "POST";
      const res = await fetch(`/api/exams/${exam.id}/publish`, { method });
      if (res.ok) {
        const newStatus = exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
        const data = await res.json();
        setExam((p) => ({ ...p, status: newStatus, shareLinks: data.shareLink ? [data.shareLink] : p.shareLinks }));
        showToast("success", newStatus === "PUBLISHED" ? "Exam published!" : "Unpublished");
      } else {
        const data = await res.json();
        showToast("error", data.error || "Failed");
      }
    } finally {
      setPublishing(false);
    }
  }

  async function updateQuestion(qid: string, updates: Partial<Question>) {
    const res = await fetch(`/api/exams/${exam.id}/questions/${qid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setExam((p) => ({ ...p, questions: p.questions.map((q) => q.id === qid ? updated : q) }));
    }
  }

  async function deleteQuestion(qid: string) {
    if (!confirm("Delete this question?")) return;
    const res = await fetch(`/api/exams/${exam.id}/questions/${qid}`, { method: "DELETE" });
    if (res.ok) {
      setExam((p) => ({ ...p, questions: p.questions.filter((q) => q.id !== qid) }));
    }
  }

  function copyShareLink() {
    if (exam.shareLinks[0]) {
      navigator.clipboard.writeText(`${window.location.origin}/exam/${exam.shareLinks[0].token}`);
      showToast("success", "Link copied!");
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">{exam.title}</h1>
              <Badge variant={exam.status === "PUBLISHED" ? "success" : "secondary"}>
                {exam.status === "PUBLISHED" ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500">{exam.questions.length} questions · {exam.totalPoints} pts · {exam._count.attempts} attempts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {exam.status === "PUBLISHED" && (
            <Button variant="outline" size="sm" onClick={copyShareLink}>
              <Share2 className="w-4 h-4 mr-1" /> Share
            </Button>
          )}
          <Link href={`/dashboard/exams/${exam.id}/attempts`}>
            <Button variant="outline" size="sm">Results</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
          <Button
            variant={exam.status === "PUBLISHED" ? "outline" : "default"}
            size="sm"
            onClick={togglePublish}
            disabled={publishing}
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : exam.status === "PUBLISHED" ? <><EyeOff className="w-4 h-4 mr-1" />Unpublish</> : <><Eye className="w-4 h-4 mr-1" />Publish</>}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions ({exam.questions.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions">
          <div className="space-y-3 mt-2">
            {exam.questions.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">No questions yet. Go back and regenerate.</div>
            ) : (
              exam.questions.map((q, i) => (
                <Card key={q.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-xs font-mono text-zinc-400 mt-0.5 w-6 shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{QUESTION_TYPE_LABELS[q.questionType] || q.questionType}</Badge>
                            <Badge variant={q.difficulty === "EASY" ? "success" : q.difficulty === "HARD" ? "destructive" : "secondary"} className="text-xs">
                              {q.difficulty}
                            </Badge>
                            {q.topicTag && <span className="text-xs text-zinc-400">{q.topicTag}</span>}
                            <span className="text-xs text-zinc-400">{q.points} pt{q.points !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)} className="p-1 rounded hover:bg-zinc-100 text-zinc-400">
                          {expandedQ === q.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  {expandedQ === q.id && (
                    <CardContent className="pt-0">
                      <QuestionEditor question={q} onSave={(updates) => updateQuestion(q.id, updates)} />
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6 mt-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic info</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={exam.title} onChange={(e) => setExam((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={2} value={exam.description || ""} onChange={(e) => setExam((p) => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Instructions</Label>
                  <Textarea rows={3} value={exam.instructions || ""} onChange={(e) => setExam((p) => ({ ...p, instructions: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={exam.durationMinutes ?? ""} onChange={(e) => setExam((p) => ({ ...p, durationMinutes: e.target.value ? Number(e.target.value) : null }))} placeholder="No limit" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Passing score (%)</Label>
                    <Input type="number" min={0} max={100} value={exam.passingScore} onChange={(e) => setExam((p) => ({ ...p, passingScore: Number(e.target.value) }))} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Behavior</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "showResultsImmediately", label: "Show results immediately after submission" },
                  { key: "showExplanations", label: "Show explanations after submission" },
                  { key: "shuffleQuestions", label: "Shuffle question order" },
                  { key: "shuffleAnswers", label: "Shuffle answer options" },
                  { key: "allowRetake", label: "Allow retakes" },
                  { key: "requireNameEmail", label: "Require name and email" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-zinc-700">{label}</span>
                    <Switch
                      checked={exam[key as keyof typeof exam] as boolean}
                      onCheckedChange={(v) => setExam((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Saving…</> : <><Save className="w-4 h-4 mr-1" />Save settings</>}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionEditor({ question, onSave }: { question: Question; onSave: (u: Partial<Question>) => void }) {
  const [text, setText] = useState(question.questionText);
  const [explanation, setExplanation] = useState(question.explanation || "");
  const [points, setPoints] = useState(question.points);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [options, setOptions] = useState<string[]>(question.options);
  const [correctAnswer, setCorrectAnswer] = useState(
    Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer
  );

  function save() {
    onSave({ questionText: text, explanation, points, difficulty, options, correctAnswer });
  }

  return (
    <div className="space-y-3 pt-2 border-t border-zinc-100">
      <div className="space-y-1.5">
        <Label className="text-xs">Question text</Label>
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} className="text-sm" />
      </div>
      {options.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options (one per line)</Label>
          <Textarea
            rows={options.length}
            value={options.join("\n")}
            onChange={(e) => setOptions(e.target.value.split("\n"))}
            className="text-sm font-mono"
          />
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Correct answer</Label>
          <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Difficulty</Label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full h-9 text-sm border border-zinc-200 rounded-md px-2">
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Points</Label>
          <Input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} className="text-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Explanation</Label>
        <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} className="text-sm" />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={save}><Save className="w-3.5 h-3.5 mr-1" /> Save question</Button>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Loader2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

interface PublicQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: string[];
  points: number;
  orderIndex: number;
}

interface PublicExam {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  durationMinutes?: number;
  requireNameEmail: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showResultsImmediately: boolean;
  allowRetake: boolean;
  totalPoints: number;
  questionCount: number;
  questions: PublicQuestion[];
  shareLinkId: string;
}

interface ScoreResult {
  score?: number;
  totalPoints?: number;
  percentage?: number;
  passed?: boolean;
  passingScore?: number;
  showResults: boolean;
  showExplanations?: boolean;
  resultSummary?: {
    correct: number;
    incorrect: number;
    skipped: number;
  };
}

type Phase = "loading" | "error" | "register" | "taking" | "submitting" | "result";
type EmailStatus = "idle" | "checking" | "blocked" | "warned" | "clear";

export function ExamTaker({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [exam, setExam] = useState<PublicExam | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [attemptId, setAttemptId] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`/api/public/exam/${token}`);
        const data = await res.json();
        if (!res.ok) { setErrorMsg(data.error || "Exam not found"); setPhase("error"); return; }
        setExam(data);
        setPhase("register");
      } catch {
        setErrorMsg("Failed to load exam"); setPhase("error");
      }
    }
    loadExam();
  }, [token]);

  // Timer
  useEffect(() => {
    if (phase !== "taking" || !exam?.durationMinutes) return;
    const endTime = startedAt + exam.durationMinutes * 60 * 1000;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) { clearInterval(tick); handleSubmit(); }
    }, 1000);
    return () => clearInterval(tick);
  }, [phase, exam, startedAt]);

  async function checkEmail(emailValue: string) {
    if (!exam?.requireNameEmail || !emailValue) return;
    setEmailStatus("checking");
    try {
      const res = await fetch(
        `/api/public/exam/${token}/check-email?email=${encodeURIComponent(emailValue)}`
      );
      if (!res.ok) { setEmailStatus("idle"); return; }
      const data: { hasAttempt: boolean; allowRetake: boolean } = await res.json();
      if (!data.hasAttempt) { setEmailStatus("clear"); return; }
      setEmailStatus(data.allowRetake ? "warned" : "blocked");
    } catch {
      setEmailStatus("idle");
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!exam) return;
    try {
      const res = await fetch("/api/public/attempt?action=start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: exam.id, shareLinkId: exam.shareLinkId, name, email }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || "Failed to start"); return; }
      setAttemptId(data.attemptId);
      setStartedAt(Date.now());
      if (exam.durationMinutes) setTimeLeft(exam.durationMinutes * 60);
      setPhase("taking");
    } catch {
      setErrorMsg("Failed to start exam");
    }
  }

  const handleSubmit = useCallback(async () => {
    if (!exam || !attemptId) return;
    setShowConfirm(false);
    setPhase("submitting");
    const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
    const submittedAnswers = exam.questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? null,
    }));
    try {
      const res = await fetch("/api/public/attempt?action=submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, answers: submittedAnswers, durationSeconds }),
      });
      const data = await res.json();
      if (res.ok) { setResult(data); setPhase("result"); }
      else { setErrorMsg(data.error || "Submission failed"); setPhase("taking"); }
    } catch {
      setErrorMsg("Submission failed"); setPhase("taking");
    }
  }, [exam, attemptId, answers, startedAt]);

  function setAnswer(qid: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function toggleMultiSelect(qid: string, option: string) {
    setAnswers((prev) => {
      const current = (prev[qid] as string[]) || [];
      return {
        ...prev,
        [qid]: current.includes(option) ? current.filter((o) => o !== option) : [...current, option],
      };
    });
  }

  if (phase === "loading") {
    return <FullscreenCenter><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></FullscreenCenter>;
  }

  if (phase === "error") {
    return (
      <FullscreenCenter>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">Exam unavailable</h2>
          <p className="text-zinc-500">{errorMsg}</p>
        </div>
      </FullscreenCenter>
    );
  }

  if (phase === "register" && exam) {
    return (
      <FullscreenCenter>
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
          </div>
          <Card>
            <CardHeader className="text-center">
              <CardTitle>{exam.title}</CardTitle>
              {exam.description && <CardDescription>{exam.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div className="flex justify-center gap-4 mb-6 text-sm text-zinc-500">
                <span>{exam.questionCount} questions</span>
                {exam.durationMinutes && <span>{exam.durationMinutes} min</span>}
                <span>{exam.totalPoints} points</span>
              </div>
              {exam.instructions && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-md p-3 mb-4 text-sm text-zinc-700">
                  {exam.instructions}
                </div>
              )}
              {errorMsg && <p className="text-sm text-red-600 mb-3">{errorMsg}</p>}
              <form onSubmit={handleRegister} className="space-y-3">
                {exam.requireNameEmail && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Full name</Label>
                      <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <div className="relative">
                        <Input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailStatus("idle"); }}
                          onBlur={(e) => checkEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={emailStatus === "blocked" ? "border-red-400 focus:ring-red-400" : ""}
                        />
                        {emailStatus === "checking" && (
                          <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-zinc-400" />
                        )}
                      </div>
                      {emailStatus === "blocked" && (
                        <div className="flex items-start gap-2 mt-1.5 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>You have already completed this exam and the owner has not enabled retakes.</span>
                        </div>
                      )}
                      {emailStatus === "warned" && (
                        <div className="flex items-start gap-2 mt-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>You've previously taken this exam. You can take it again.</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <Button type="submit" className="w-full" disabled={emailStatus === "blocked"}>
                  Start exam
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </FullscreenCenter>
    );
  }

  if ((phase === "taking" || phase === "submitting") && exam) {
    const q = exam.questions[currentIndex];
    const progress = Math.round(((currentIndex + 1) / exam.questions.length) * 100);
    const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined && v !== "").length;

    return (
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <div className="bg-white border-b border-zinc-200 px-6 py-3 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 truncate">{exam.title}</p>
              <p className="text-xs text-zinc-500">Question {currentIndex + 1} of {exam.questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
              {timeLeft !== null && (
                <div className={`flex items-center gap-1.5 text-sm font-mono font-medium ${timeLeft < 300 ? "text-red-600" : "text-zinc-700"}`}>
                  <Clock className="w-4 h-4" />
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                </div>
              )}
              <Badge variant="secondary">{answeredCount}/{exam.questions.length} answered</Badge>
            </div>
          </div>
          <div className="max-w-6xl mx-auto mt-2">
            <Progress value={progress} />
          </div>
        </div>

        {/* Two-column layout */}
        <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8 items-start">
          {/* Main — question */}
          <div className="flex-1 min-w-0">
            <Card className="mb-5">
              <CardHeader className="pb-3">
                <p className="text-xs text-zinc-400 font-mono mb-1">Q{currentIndex + 1} · {q.points} pt{q.points !== 1 ? "s" : ""}</p>
                <CardTitle className="text-lg leading-relaxed font-medium">{q.questionText}</CardTitle>
              </CardHeader>
              <CardContent>
                <QuestionInput
                  question={q}
                  answer={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                  onToggleMulti={(opt) => toggleMultiSelect(q.id, opt)}
                />
              </CardContent>
            </Card>

            {/* Prev / Next */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              {currentIndex < exam.questions.length - 1 && (
                <Button onClick={() => setCurrentIndex((i) => i + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-56 shrink-0">
            <div className="sticky top-24 space-y-4">
              {/* Question grid */}
              <div className="bg-white border border-zinc-200 rounded-xl p-4">
                <p className="text-xs font-medium text-zinc-500 mb-3">Questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {exam.questions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                        i === currentIndex
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : answers[exam.questions[i].id] !== undefined &&
                            answers[exam.questions[i].id] !== null &&
                            answers[exam.questions[i].id] !== ""
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-400 mt-3">
                  {answeredCount} of {exam.questions.length} answered
                </p>
              </div>

              {/* Submit */}
              <Button
                className="w-full"
                onClick={() => setShowConfirm(true)}
                disabled={phase === "submitting"}
              >
                {phase === "submitting"
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Submitting…</>
                  : "Submit exam"}
              </Button>

              {errorMsg && (
                <p className="text-xs text-red-600 text-center">{errorMsg}</p>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation modal */}
        {showConfirm && (
          <ConfirmModal
            answeredCount={answeredCount}
            total={exam.questions.length}
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    );
  }

  if (phase === "result") {
    return (
      <FullscreenCenter>
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <CardTitle>Submission received</CardTitle>
              <CardDescription>Thank you for completing the exam.</CardDescription>
            </CardHeader>
            <CardContent className="text-center text-sm text-zinc-500 pb-6">
              Your answers have been recorded. Results will be shared by the exam owner.
            </CardContent>
          </Card>
        </div>
      </FullscreenCenter>
    );
  }

  return null;
}

function ConfirmModal({ answeredCount, total, onConfirm, onCancel }: {
  answeredCount: number;
  total: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const unanswered = total - answeredCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 text-center mb-2">Submit exam?</h2>
        <p className="text-sm text-zinc-500 text-center mb-1">
          You've answered <span className="font-semibold text-zinc-700">{answeredCount} of {total}</span> questions.
        </p>
        {unanswered > 0 && (
          <p className="text-sm text-amber-600 text-center mb-5">
            {unanswered} question{unanswered !== 1 ? "s" : ""} will be marked as skipped.
          </p>
        )}
        {unanswered === 0 && <div className="mb-5" />}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({ question, answer, onChange, onToggleMulti }: {
  question: PublicQuestion;
  answer: unknown;
  onChange: (v: unknown) => void;
  onToggleMulti: (opt: string) => void;
}) {
  if (question.questionType === "MULTIPLE_CHOICE") {
    return (
      <div className="space-y-2">
        {question.options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
              answer === opt ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <input type="radio" name={question.id} value={opt} checked={answer === opt} onChange={() => onChange(opt)} className="accent-zinc-900" />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.questionType === "MULTIPLE_SELECT") {
    const selected = (answer as string[]) || [];
    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 mb-2">Select all that apply</p>
        {question.options.map((opt, i) => (
          <label
            key={i}
            className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
              selected.includes(opt) ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggleMulti(opt)} className="accent-zinc-900" />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.questionType === "TRUE_FALSE") {
    return (
      <div className="flex gap-3">
        {["True", "False"].map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-3.5 rounded-lg border text-sm font-medium transition-colors ${
              answer === opt ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  // SHORT_ANSWER, OPEN_ENDED, FILL_IN_BLANK
  const isLong = question.questionType === "OPEN_ENDED";
  return isLong ? (
    <textarea
      className="w-full min-h-[140px] text-sm border border-zinc-200 rounded-lg p-3.5 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
      placeholder="Your answer..."
      value={(answer as string) || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      type="text"
      className="w-full h-10 text-sm border border-zinc-200 rounded-lg px-3.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      placeholder="Your answer..."
      value={(answer as string) || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FullscreenCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      {children}
    </div>
  );
}

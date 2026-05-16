"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, CircleDashed, AlertCircle, Mail, Loader2 } from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

interface AnswerRow {
  questionId: string;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string | string[];
  explanation?: string | null;
  points: number;
  candidateAnswer: string | string[] | null;
  isCorrect: boolean;
  awardedPoints: number;
}

interface Attempt {
  id: string;
  status: string;
  score?: number | null;
  percentage?: number | null;
  startedAt: Date;
  submittedAt?: Date | null;
  durationSeconds?: number | null;
  candidate: { name: string; email: string };
  resultSummary: Record<string, unknown>;
  answers: AnswerRow[];
}

interface Exam {
  id: string;
  title: string;
  passingScore: number;
  totalPoints: number;
}

function renderAnswer(v: unknown): string {
  if (Array.isArray(v)) return (v as unknown[]).map(String).join(", ");
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export function AttemptDetail({ exam, attempt }: { exam: Exam; attempt: Attempt }) {
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [sending, setSending] = useState(false);

  const submitted = attempt.status === "SUBMITTED";
  const passed = submitted && (attempt.percentage ?? 0) >= exam.passingScore;
  const summary = attempt.resultSummary as {
    correct?: number;
    incorrect?: number;
    skipped?: number;
  };

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSendResults() {
    setSending(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/attempts/${attempt.id}/email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send email");
      showToast("success", `Results sent to ${attempt.candidate.email}`);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={`/dashboard/exams/${exam.id}/attempts`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 truncate">{attempt.candidate.name}</h1>
            <p className="text-sm text-zinc-500 truncate">
              {attempt.candidate.email} · {exam.title}
            </p>
          </div>
        </div>
        {submitted && (
          <Button onClick={handleSendResults} disabled={sending} size="sm" variant="outline" className="shrink-0 self-start sm:self-auto">
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            {sending ? "Sending…" : "Send Results"}
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Status">
          <Badge
            variant={
              attempt.status === "SUBMITTED"
                ? "success"
                : attempt.status === "ABANDONED"
                ? "warning"
                : "secondary"
            }
          >
            {attempt.status}
          </Badge>
        </StatCard>
        <StatCard label="Score">
          {submitted ? (
            <div>
              <span
                className={`text-2xl font-bold ${passed ? "text-emerald-600" : "text-red-600"}`}
              >
                {attempt.percentage}%
              </span>
              <p className="text-xs text-zinc-500 mt-0.5">
                {attempt.score} / {exam.totalPoints} pts
              </p>
            </div>
          ) : (
            <span className="text-zinc-400 text-sm">—</span>
          )}
        </StatCard>
        <StatCard label="Duration">
          {attempt.durationSeconds ? (
            <span className="text-lg font-semibold text-zinc-900">
              {formatDuration(attempt.durationSeconds)}
            </span>
          ) : (
            <span className="text-zinc-400 text-sm">—</span>
          )}
        </StatCard>
        <StatCard label="Submitted">
          <span className="text-sm text-zinc-700">
            {attempt.submittedAt ? formatDate(attempt.submittedAt) : "—"}
          </span>
        </StatCard>
      </div>

      {submitted && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-lg font-bold text-emerald-700">{summary.correct ?? 0}</p>
                <p className="text-xs text-emerald-600">Correct</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-700">{summary.incorrect ?? 0}</p>
                <p className="text-xs text-red-600">Incorrect</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-lg">
                <p className="text-lg font-bold text-zinc-700">{summary.skipped ?? 0}</p>
                <p className="text-xs text-zinc-500">Skipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Answers */}
      {!submitted ? (
        <div className="text-center py-10 text-zinc-500 text-sm">
          This candidate hasn&apos;t submitted yet. Answers will appear here once they do.
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 mt-2">
            Question-by-question answers
          </h2>
          {attempt.answers.map((a, i) => {
            const skipped =
              a.candidateAnswer === null ||
              a.candidateAnswer === undefined ||
              a.candidateAnswer === "" ||
              (Array.isArray(a.candidateAnswer) && a.candidateAnswer.length === 0);
            return (
              <Card key={a.questionId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-zinc-400 mt-0.5 w-6 shrink-0">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900">{a.questionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {skipped ? (
                          <Badge variant="secondary" className="text-xs">
                            <CircleDashed className="w-3 h-3 mr-1" />
                            Skipped
                          </Badge>
                        ) : a.isCorrect ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Correct
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Incorrect
                          </Badge>
                        )}
                        <span className="text-xs text-zinc-400">
                          {a.awardedPoints} / {a.points} pt{a.points !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-6 sm:pl-10 space-y-2 text-sm">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Candidate answer</p>
                    <div
                      className={`p-2.5 rounded-md border text-sm ${
                        skipped
                          ? "bg-zinc-50 border-zinc-200 text-zinc-400 italic"
                          : a.isCorrect
                          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                          : "bg-red-50 border-red-200 text-red-900"
                      }`}
                    >
                      {skipped ? "No answer" : renderAnswer(a.candidateAnswer)}
                    </div>
                  </div>
                  {!a.isCorrect && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Correct answer</p>
                      <div className="p-2.5 rounded-md border bg-emerald-50 border-emerald-200 text-emerald-900 text-sm">
                        {renderAnswer(a.correctAnswer)}
                      </div>
                    </div>
                  )}
                  {a.explanation && (
                    <div>
                      <p className="text-xs font-medium text-zinc-500 mb-1">Explanation</p>
                      <p className="text-sm text-zinc-600 leading-relaxed">{a.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-zinc-500 mb-2">{label}</p>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Users, Trophy, TrendingUp, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

interface Attempt {
  id: string;
  status: string;
  score?: number | null;
  percentage?: number | null;
  startedAt: Date;
  submittedAt?: Date | null;
  durationSeconds?: number | null;
  candidate: { name: string; email: string };
}

interface Analytics {
  total: number;
  submitted: number;
  avgScore: number;
  passCount: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
}

export function AttemptsView({ exam, attempts, analytics }: {
  exam: { id: string; title: string; passingScore: number; questionCount: number };
  attempts: Attempt[];
  analytics: Analytics;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/exams/${exam.id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Results — {exam.title}</h1>
          <p className="text-sm text-zinc-500">{analytics.total} total attempts</p>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total attempts" value={analytics.total} />
        <StatCard icon={CheckCircle} label="Submitted" value={analytics.submitted} />
        <StatCard icon={TrendingUp} label="Avg score" value={`${analytics.avgScore}%`} />
        <StatCard icon={Trophy} label="Pass rate" value={`${analytics.passRate}%`} />
      </div>

      {analytics.submitted > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Score distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-sm text-zinc-600 mb-1">
                  <span>Average</span><span className="font-medium">{analytics.avgScore}%</span>
                </div>
                <Progress value={analytics.avgScore} />
              </div>
              <div>
                <div className="flex justify-between text-sm text-zinc-600 mb-1">
                  <span>Highest</span><span className="font-medium">{analytics.highestScore}%</span>
                </div>
                <Progress value={analytics.highestScore} className="[&>div]:bg-emerald-500" />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
              <span>Lowest: {analytics.lowestScore}%</span>
              <span>Passing score: {exam.passingScore}%</span>
              <span>{analytics.passCount} passed</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attempts Table */}
      {attempts.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
          <p className="font-medium">No attempts yet</p>
          <p className="text-sm mt-1">Share the exam link to invite candidates</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 sm:gap-4 px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wide">
            <span>Candidate</span>
            <span>Status</span>
            <span>Score</span>
            <span className="hidden sm:block">Date</span>
            <span className="sr-only">Details</span>
          </div>
          {attempts.map((attempt) => {
            const passed = attempt.status === "SUBMITTED" && (attempt.percentage || 0) >= exam.passingScore;
            const row = (
              <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 sm:gap-4 items-center px-4 py-3 bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{attempt.candidate.name}</p>
                  <p className="text-xs text-zinc-400">{attempt.candidate.email}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 sm:hidden">{formatDate(attempt.startedAt)}</p>
                </div>
                <div>
                  <Badge
                    variant={attempt.status === "SUBMITTED" ? "success" : attempt.status === "ABANDONED" ? "warning" : "secondary"}
                    className="text-xs"
                  >
                    {attempt.status}
                  </Badge>
                </div>
                <div>
                  {attempt.status === "SUBMITTED" ? (
                    <div>
                      <span className={`text-sm font-semibold ${passed ? "text-emerald-600" : "text-red-600"}`}>
                        {attempt.percentage}%
                      </span>
                      <span className="hidden sm:inline text-xs text-zinc-400 ml-1">({attempt.score} pts)</span>
                      {attempt.durationSeconds && (
                        <p className="hidden sm:flex text-xs text-zinc-400 items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{formatDuration(attempt.durationSeconds)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </div>
                <div className="hidden sm:block text-xs text-zinc-500">{formatDate(attempt.startedAt)}</div>
                <div className="hidden sm:block text-zinc-300">
                  {attempt.status === "SUBMITTED" && <ChevronRight className="w-4 h-4" />}
                </div>
              </div>
            );
            return attempt.status === "SUBMITTED" ? (
              <Link
                key={attempt.id}
                href={`/dashboard/exams/${exam.id}/attempts/${attempt.id}`}
                className="block"
              >
                {row}
              </Link>
            ) : (
              <div key={attempt.id}>{row}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </CardContent>
    </Card>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Users, TrendingUp, Zap, CheckCircle2, XCircle,
  Clock, Bot, Activity, BarChart3, Layers,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function pct(a: number, b: number) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

export default async function OverviewPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [examRows, attemptsRaw, logsRaw, recentLogs, providers] = await Promise.all([
    prisma.exam.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.examAttempt.findMany({
      where: { exam: { userId } },
      select: { candidateId: true, status: true, percentage: true, exam: { select: { passingScore: true } } },
    }),
    prisma.generationLog.findMany({
      where: { userId },
      select: {
        status: true,
        tokenUsage: true,
        generationMode: true,
        providerConfig: { select: { label: true, modelName: true, providerType: true } },
      },
    }),
    prisma.generationLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        generationMode: true,
        status: true,
        tokenUsage: true,
        createdAt: true,
        errorMessage: true,
        exam: { select: { title: true } },
        providerConfig: { select: { label: true, modelName: true } },
      },
    }),
    prisma.aIProviderConfig.findMany({
      where: { userId },
      select: { label: true, modelName: true, providerType: true, isDefault: true },
    }),
  ]);

  // ── Exam stats ──────────────────────────────────────────────────────────────
  type ExamRow = (typeof examRows)[number];
  const examByStatus = Object.fromEntries(examRows.map((r: ExamRow) => [r.status, r._count.id] as [string, number]));
  const totalExams = Object.values(examByStatus).reduce((s: number, c: number) => s + c, 0);
  const publishedExams = examByStatus["PUBLISHED"] ?? 0;
  const draftExams = examByStatus["DRAFT"] ?? 0;

  // ── Attempt stats ───────────────────────────────────────────────────────────
  type RawAttempt = (typeof attemptsRaw)[number];
  const submitted = attemptsRaw.filter((a: RawAttempt) => a.status === "SUBMITTED");
  const passing = submitted.filter(
    (a: RawAttempt) => a.percentage !== null && a.percentage !== undefined && a.percentage >= a.exam.passingScore
  );
  const totalAttempts = attemptsRaw.length;
  const passRate = pct(passing.length, submitted.length);

  const uniqueCandidateIds = new Set(attemptsRaw.map((a: RawAttempt) => a.candidateId));

  // ── Token stats ─────────────────────────────────────────────────────────────
  let totalTokens = 0, promptTokens = 0, completionTokens = 0;
  for (const log of logsRaw) {
    const u = (log.tokenUsage ?? {}) as Record<string, number>;
    totalTokens += u.totalTokens ?? 0;
    promptTokens += u.promptTokens ?? 0;
    completionTokens += u.completionTokens ?? 0;
  }

  // ── Generation health ───────────────────────────────────────────────────────
  type RawLog = (typeof logsRaw)[number];
  const totalGenerations = logsRaw.length;
  const successGenerations = logsRaw.filter((l: RawLog) => l.status === "SUCCESS").length;
  const failedGenerations = logsRaw.filter((l: RawLog) => l.status === "FAILED").length;
  const successRate = pct(successGenerations, totalGenerations);

  // ── Models breakdown ────────────────────────────────────────────────────────
  const modelMap = new Map<
    string,
    { label: string; model: string; provider: string; total: number; success: number; tokens: number }
  >();
  for (const log of logsRaw) {
    if (!log.providerConfig) continue;
    const key = log.providerConfig.modelName;
    const u = (log.tokenUsage ?? {}) as Record<string, number>;
    const prev = modelMap.get(key) ?? {
      label: log.providerConfig.label,
      model: log.providerConfig.modelName,
      provider: log.providerConfig.providerType,
      total: 0,
      success: 0,
      tokens: 0,
    };
    prev.total++;
    if (log.status === "SUCCESS") prev.success++;
    prev.tokens += u.totalTokens ?? 0;
    modelMap.set(key, prev);
  }
  const models = [...modelMap.values()].sort((a, b) => b.total - a.total);

  // ── Candidate count (unique by attempt) ─────────────────────────────────────
  const totalCandidates = uniqueCandidateIds.size;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Overview</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Platform activity and AI usage at a glance</p>
      </div>

      {/* ── Key metrics ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5 text-zinc-600" />}
          label="Total Exams"
          value={totalExams}
          sub={`${publishedExams} published · ${draftExams} draft`}
          color="bg-zinc-100"
        />
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          label="Candidates"
          value={totalCandidates}
          sub={`${totalAttempts} total attempt${totalAttempts !== 1 ? "s" : ""}`}
          color="bg-indigo-50"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          label="Pass Rate"
          value={`${passRate}%`}
          sub={`${passing.length} of ${submitted.length} submitted`}
          color="bg-emerald-50"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-amber-600" />}
          label="Tokens Used"
          value={fmt(totalTokens)}
          sub={`${fmt(promptTokens)} prompt · ${fmt(completionTokens)} completion`}
          color="bg-amber-50"
        />
      </div>

      {/* ── AI usage section ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Generation health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Generation Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalGenerations === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No generations yet</p>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-zinc-500">{totalGenerations} total generations</span>
                  <span className="font-medium text-zinc-900">{successRate}% success</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${successRate}%` }}
                  />
                  <div
                    className="h-full bg-red-400"
                    style={{ width: `${pct(failedGenerations, totalGenerations)}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    {successGenerations} success
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                    {failedGenerations} failed
                  </span>
                  <span className="flex items-center gap-1.5 text-zinc-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block" />
                    {totalGenerations - successGenerations - failedGenerations} running
                  </span>
                </div>

                {/* Mode breakdown */}
                <div className="pt-2 border-t border-zinc-100 space-y-1.5">
                  {(["TOPIC", "DOCUMENT"] as const).map((mode) => {
                    const count = logsRaw.filter((l: RawLog) => l.generationMode === mode).length;
                    if (count === 0) return null;
                    return (
                      <div key={mode} className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3 h-3" />
                          {mode === "TOPIC" ? "From Topics" : "From Document"}
                        </span>
                        <span className="font-medium text-zinc-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Token breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Token Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalTokens === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No token usage yet</p>
            ) : (
              <>
                <div className="text-3xl font-bold text-zinc-900 tabular-nums">
                  {fmt(totalTokens)}
                  <span className="text-sm font-normal text-zinc-400 ml-1">total tokens</span>
                </div>
                <div className="space-y-2">
                  <TokenBar label="Prompt" value={promptTokens} total={totalTokens} color="bg-indigo-500" />
                  <TokenBar label="Completion" value={completionTokens} total={totalTokens} color="bg-amber-400" />
                </div>
                <p className="text-xs text-zinc-400 pt-1 border-t border-zinc-100">
                  Avg {fmt(totalGenerations > 0 ? Math.round(totalTokens / totalGenerations) : 0)} tokens / generation
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Models & Providers ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Models &amp; Providers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No AI providers configured yet</p>
          ) : (
            <div className="space-y-0">
              <div className="grid grid-cols-5 text-xs font-medium text-zinc-400 pb-2 border-b border-zinc-100 px-1">
                <span className="col-span-2">Model</span>
                <span className="text-center">Runs</span>
                <span className="text-center">Tokens</span>
                <span className="text-center">Success</span>
              </div>
              {providers.map((p) => {
                const usage = modelMap.get(p.modelName);
                return (
                  <div
                    key={p.label}
                    className="grid grid-cols-5 text-sm py-2.5 px-1 border-b border-zinc-50 last:border-0 items-center"
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800 truncate">{p.modelName}</span>
                        {p.isDefault && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">default</Badge>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">{p.label} · {p.providerType}</span>
                    </div>
                    <span className="text-center text-zinc-600">{usage?.total ?? 0}</span>
                    <span className="text-center text-zinc-600">{fmt(usage?.tokens ?? 0)}</span>
                    <span className="text-center">
                      {usage ? (
                        <span className={`font-medium ${usage.success === usage.total ? "text-emerald-600" : usage.success === 0 ? "text-red-500" : "text-amber-600"}`}>
                          {pct(usage.success, usage.total)}%
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Recent Activity ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Generation Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No activity yet</p>
          ) : (
            <div className="space-y-0">
              {recentLogs.map((log) => {
                const u = (log.tokenUsage ?? {}) as Record<string, number>;
                const tokens = u.totalTokens ?? 0;
                return (
                  <div key={log.id} className="flex items-start gap-3 py-3 border-b border-zinc-50 last:border-0">
                    <div className="mt-0.5 shrink-0">
                      {log.status === "SUCCESS" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : log.status === "FAILED" ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-800 font-medium truncate">
                        {log.exam?.title ?? "Untitled exam"}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {log.generationMode === "TOPIC" ? "From Topics" : "From Document"}
                        {log.providerConfig && ` · ${log.providerConfig.modelName}`}
                        {tokens > 0 && ` · ${fmt(tokens)} tokens`}
                      </p>
                      {log.errorMessage && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">{log.errorMessage}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge
                        variant={log.status === "SUCCESS" ? "success" : log.status === "FAILED" ? "destructive" : "warning"}
                        className="text-[10px]"
                      >
                        {log.status}
                      </Badge>
                      <p className="text-[11px] text-zinc-400 mt-1">{formatDate(log.createdAt.toString())}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1 tabular-nums">{value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TokenBar({
  label, value, total, color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const width = pct(value, total);
  return (
    <div>
      <div className="flex justify-between text-xs text-zinc-500 mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{fmt(value)} ({width}%)</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { sendResultEmail } from "@/lib/email";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id: examId, attemptId } = await params;

  const exam = await prisma.exam.findFirst({ where: { id: examId, userId: userId! } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, examId },
    include: { candidate: true },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  if (attempt.status !== "SUBMITTED") {
    return NextResponse.json({ error: "Attempt has not been submitted yet" }, { status: 400 });
  }

  const summary = attempt.resultSummary as { correct?: number; incorrect?: number; skipped?: number };

  try {
    await sendResultEmail({
      candidateName: attempt.candidate.name,
      candidateEmail: attempt.candidate.email,
      examTitle: exam.title,
      percentage: attempt.percentage ?? 0,
      score: attempt.score ?? 0,
      totalPoints: exam.totalPoints,
      passingScore: exam.passingScore,
      passed: (attempt.percentage ?? 0) >= exam.passingScore,
      correct: summary.correct ?? 0,
      incorrect: summary.incorrect ?? 0,
      skipped: summary.skipped ?? 0,
      submittedAt: attempt.submittedAt ?? new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send email";
    console.error("[email route]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

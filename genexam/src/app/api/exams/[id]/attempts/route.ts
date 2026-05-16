import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id: examId } = await params;

  const exam = await prisma.exam.findFirst({ where: { id: examId, userId: userId! } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const attempts = await prisma.examAttempt.findMany({
    where: { examId },
    include: {
      candidate: true,
      answers: { include: { question: { select: { questionText: true, topicTag: true, difficulty: true } } } },
    },
    orderBy: { startedAt: "desc" },
  });

  type AttemptRow = (typeof attempts)[number];
  const submitted = attempts.filter((a: AttemptRow) => a.status === "SUBMITTED");
  const scores = submitted.map((a: AttemptRow) => a.percentage || 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((acc: number, s: number) => acc + s, 0) / scores.length) : 0;
  const passCount = submitted.filter((a: AttemptRow) => (a.percentage || 0) >= exam.passingScore).length;

  return NextResponse.json({
    attempts,
    analytics: {
      total: attempts.length,
      submitted: submitted.length,
      avgScore,
      passCount,
      passRate: submitted.length > 0 ? Math.round((passCount / submitted.length) * 100) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    },
  });
}

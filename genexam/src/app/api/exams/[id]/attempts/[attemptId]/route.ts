import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(
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
    include: {
      candidate: true,
      answers: { include: { question: true } },
    },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

  const questions = await prisma.examQuestion.findMany({
    where: { examId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true },
  });
  const order = new Map(questions.map((q: { id: string; orderIndex: number }) => [q.id, q.orderIndex]));
  attempt.answers.sort(
    (a, b) => (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0)
  );

  return NextResponse.json({ exam, attempt });
}

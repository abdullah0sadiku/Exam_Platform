import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ResultEmailParams } from "@/lib/email-templates/result";

export type LoadResult =
  | { kind: "ok"; params: ResultEmailParams }
  | { kind: "error"; response: NextResponse };

export async function loadAttemptForOwner(
  examId: string,
  attemptId: string,
  ownerId: string
): Promise<LoadResult> {
  const exam = await prisma.exam.findFirst({ where: { id: examId, userId: ownerId } });
  if (!exam) {
    return {
      kind: "error",
      response: NextResponse.json({ error: "Exam not found" }, { status: 404 }),
    };
  }

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, examId },
    include: {
      candidate: true,
      answers: { include: { question: true } },
    },
  });
  if (!attempt) {
    return {
      kind: "error",
      response: NextResponse.json({ error: "Attempt not found" }, { status: 404 }),
    };
  }
  if (attempt.status !== "SUBMITTED") {
    return {
      kind: "error",
      response: NextResponse.json(
        { error: "Attempt has not been submitted yet" },
        { status: 400 }
      ),
    };
  }

  const questions = await prisma.examQuestion.findMany({
    where: { examId },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true },
  });
  const order = new Map(questions.map((q) => [q.id, q.orderIndex]));
  const sortedAnswers = [...attempt.answers].sort(
    (a, b) => (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0)
  );

  const summary = (attempt.resultSummary ?? {}) as {
    correct?: number;
    incorrect?: number;
    skipped?: number;
  };

  return {
    kind: "ok",
    params: {
      examTitle: exam.title,
      passingScore: exam.passingScore,
      totalPoints: exam.totalPoints,
      candidate: { name: attempt.candidate.name, email: attempt.candidate.email },
      score: attempt.score ?? 0,
      percentage: attempt.percentage ?? 0,
      summary: {
        correct: summary.correct ?? 0,
        incorrect: summary.incorrect ?? 0,
        skipped: summary.skipped ?? 0,
      },
      answers: sortedAnswers.map((a) => ({
        questionText: a.question.questionText,
        correctAnswer: a.question.correctAnswer as string | string[],
        candidateAnswer: a.answer as string | string[] | null,
        isCorrect: a.isCorrect,
        points: a.question.points,
        awardedPoints: a.awardedPoints,
      })),
    },
  };
}

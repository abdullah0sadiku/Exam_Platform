import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AttemptDetail } from "@/components/exam/attempt-detail";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const { id, attemptId } = await params;
  const session = await auth();

  const exam = await prisma.exam.findFirst({ where: { id, userId: session!.user!.id! } });
  if (!exam) notFound();

  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, examId: id },
    include: {
      candidate: true,
      answers: { include: { question: true } },
    },
  });
  if (!attempt) notFound();

  const questions = await prisma.examQuestion.findMany({
    where: { examId: id },
    orderBy: { orderIndex: "asc" },
    select: { id: true, orderIndex: true },
  });
  const order = new Map<string, number>(questions.map((q: { id: string; orderIndex: number }) => [q.id, q.orderIndex] as [string, number]));
  type Answer = (typeof attempt.answers)[number];
  const answers = [...attempt.answers].sort(
    (a: Answer, b: Answer) => (order.get(a.questionId) ?? 0) - (order.get(b.questionId) ?? 0)
  );

  return (
    <AttemptDetail
      exam={{
        id: exam.id,
        title: exam.title,
        passingScore: exam.passingScore,
        totalPoints: exam.totalPoints,
      }}
      attempt={{
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        percentage: attempt.percentage,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        durationSeconds: attempt.durationSeconds,
        candidate: { name: attempt.candidate.name, email: attempt.candidate.email },
        resultSummary: (attempt.resultSummary ?? {}) as Record<string, unknown>,
        answers: answers.map((a: Answer) => ({
          questionId: a.questionId,
          questionText: a.question.questionText,
          questionType: a.question.questionType,
          options: a.question.options as string[],
          correctAnswer: a.question.correctAnswer as string | string[],
          explanation: a.question.explanation,
          points: a.question.points,
          candidateAnswer: a.answer as string | string[] | null,
          isCorrect: a.isCorrect,
          awardedPoints: a.awardedPoints,
        })),
      }}
    />
  );
}

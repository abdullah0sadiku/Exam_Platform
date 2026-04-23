import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AttemptsView } from "@/components/exam/attempts-view";

export default async function AttemptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const exam = await prisma.exam.findFirst({
    where: { id, userId: session!.user!.id! },
    include: {
      attempts: {
        include: { candidate: true },
        orderBy: { startedAt: "desc" },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!exam) notFound();

  const submitted = exam.attempts.filter((a) => a.status === "SUBMITTED");
  const scores = submitted.map((a) => a.percentage ?? 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length) : 0;
  const passCount = submitted.filter((a) => (a.percentage ?? 0) >= exam.passingScore).length;

  return (
    <AttemptsView
      exam={{ id: exam.id, title: exam.title, passingScore: exam.passingScore, questionCount: exam._count.questions }}
      attempts={exam.attempts.map((a) => ({
        id: a.id,
        status: a.status,
        score: a.score,
        percentage: a.percentage,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        durationSeconds: a.durationSeconds,
        candidate: { name: a.candidate.name, email: a.candidate.email },
      }))}
      analytics={{
        total: exam.attempts.length,
        submitted: submitted.length,
        avgScore,
        passCount,
        passRate: submitted.length > 0 ? Math.round((passCount / submitted.length) * 100) : 0,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      }}
    />
  );
}

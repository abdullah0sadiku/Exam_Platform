import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ExamEditor } from "@/components/exam/exam-editor";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const exam = await prisma.exam.findFirst({
    where: { id, userId: session!.user!.id! },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      shareLinks: { where: { isActive: true }, take: 1 },
      _count: { select: { attempts: true } },
    },
  });

  if (!exam) notFound();

  return (
    <ExamEditor
      exam={{
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        status: exam.status,
        sourceType: exam.sourceType,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        showResultsImmediately: exam.showResultsImmediately,
        showExplanations: exam.showExplanations,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleAnswers: exam.shuffleAnswers,
        allowRetake: exam.allowRetake,
        requireNameEmail: exam.requireNameEmail,
        totalPoints: exam.totalPoints,
        questions: exam.questions.map((q: (typeof exam.questions)[number]) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options as string[],
          correctAnswer: q.correctAnswer as string | string[],
          explanation: q.explanation,
          difficulty: q.difficulty,
          topicTag: q.topicTag,
          sourceReference: q.sourceReference,
          points: q.points,
          orderIndex: q.orderIndex,
        })),
        shareLinks: exam.shareLinks.map((sl: (typeof exam.shareLinks)[number]) => ({ token: sl.token })),
        _count: exam._count,
      }}
    />
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      exam: {
        include: {
          questions: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!shareLink || !shareLink.isActive) {
    return NextResponse.json({ error: "Exam not found or link is inactive" }, { status: 404 });
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return NextResponse.json({ error: "This exam link has expired" }, { status: 410 });
  }

  if (shareLink.exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "This exam is not currently available" }, { status: 403 });
  }

  const exam = shareLink.exam;
  // Strip correct answers and explanations
  const sanitizedQuestions = exam.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    options: q.options,
    points: q.points,
    orderIndex: q.orderIndex,
  }));

  return NextResponse.json({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    instructions: exam.instructions,
    durationMinutes: exam.durationMinutes,
    requireNameEmail: exam.requireNameEmail,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleAnswers: exam.shuffleAnswers,
    showResultsImmediately: exam.showResultsImmediately,
    allowRetake: exam.allowRetake,
    totalPoints: exam.totalPoints,
    questionCount: exam.questions.length,
    questions: sanitizedQuestions,
    shareLinkId: shareLink.id,
  });
}

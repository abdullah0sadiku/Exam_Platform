import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { toJson } from "@/lib/utils";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  try {
    const exam = await prisma.exam.findFirst({
      where: { id, userId: userId! },
      include: { questions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const newExam = await prisma.exam.create({
      data: {
        userId: userId!,
        title: `${exam.title} (Copy)`,
        description: exam.description,
        sourceType: exam.sourceType,
        status: "DRAFT",
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        totalPoints: exam.totalPoints,
        showResultsImmediately: exam.showResultsImmediately,
        showExplanations: exam.showExplanations,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleAnswers: exam.shuffleAnswers,
        allowRetake: exam.allowRetake,
        requireNameEmail: exam.requireNameEmail,
        metadata: toJson(exam.metadata),
        questions: {
          create: exam.questions.map((q) => ({
            questionText: q.questionText,
            questionType: q.questionType,
            options: toJson(q.options),
            correctAnswer: q.correctAnswer as string,
            explanation: q.explanation,
            difficulty: q.difficulty,
            topicTag: q.topicTag,
            sourceReference: q.sourceReference,
            points: q.points,
            orderIndex: q.orderIndex,
          })),
        },
      },
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    return NextResponse.json(newExam, { status: 201 });
  } catch {
    return apiError("Failed to duplicate exam");
  }
}

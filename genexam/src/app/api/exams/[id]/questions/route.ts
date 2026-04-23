import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { z } from "zod";

const questionSchema = z.object({
  questionText: z.string().min(1),
  questionType: z.enum(["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "SHORT_ANSWER", "OPEN_ENDED", "FILL_IN_BLANK"]),
  options: z.array(z.string()).default([]),
  correctAnswer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  topicTag: z.string().optional(),
  sourceReference: z.string().optional(),
  points: z.number().min(1).default(1),
  orderIndex: z.number().default(0),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id: examId } = await params;

  const exam = await prisma.exam.findFirst({ where: { id: examId, userId: userId! } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = questionSchema.parse(body);

    const question = await prisma.examQuestion.create({
      data: {
        examId,
        questionText: data.questionText,
        questionType: data.questionType,
        options: data.options,
        correctAnswer: data.correctAnswer as string,
        explanation: data.explanation,
        difficulty: data.difficulty,
        topicTag: data.topicTag,
        sourceReference: data.sourceReference,
        points: data.points,
        orderIndex: data.orderIndex,
      },
    });

    const questions = await prisma.examQuestion.findMany({ where: { examId } });
    const totalPoints = questions.reduce((s: number, q: { points: number }) => s + q.points, 0);
    await prisma.exam.update({ where: { id: examId }, data: { totalPoints } });

    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return apiError("Failed to add question");
  }
}

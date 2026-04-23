import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { z } from "zod";

const updateSchema = z.object({
  questionText: z.string().min(1).optional(),
  questionType: z.enum(["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "SHORT_ANSWER", "OPEN_ENDED", "FILL_IN_BLANK"]).optional(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
  explanation: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  topicTag: z.string().optional(),
  sourceReference: z.string().optional(),
  points: z.number().min(1).optional(),
  orderIndex: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id: examId, qid } = await params;

  const exam = await prisma.exam.findFirst({ where: { id: examId, userId: userId! } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const question = await prisma.examQuestion.update({
      where: { id: qid },
      data: data as Record<string, unknown>,
    });

    if (data.points !== undefined) {
      const questions = await prisma.examQuestion.findMany({ where: { examId } });
      const totalPoints = questions.reduce((s: number, q: { points: number }) => s + q.points, 0);
      await prisma.exam.update({ where: { id: examId }, data: { totalPoints } });
    }

    return NextResponse.json(question);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return apiError("Failed to update question");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id: examId, qid } = await params;

  const exam = await prisma.exam.findFirst({ where: { id: examId, userId: userId! } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  await prisma.examQuestion.delete({ where: { id: qid } });

  const questions = await prisma.examQuestion.findMany({ where: { examId } });
  const totalPoints = questions.reduce((s: number, q: { points: number }) => s + q.points, 0);
  await prisma.exam.update({ where: { id: examId }, data: { totalPoints } });

  return NextResponse.json({ success: true });
}

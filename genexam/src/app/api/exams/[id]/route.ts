import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { toJson } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  instructions: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  durationMinutes: z.number().optional().nullable(),
  passingScore: z.number().min(0).max(100).optional(),
  showResultsImmediately: z.boolean().optional(),
  showExplanations: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleAnswers: z.boolean().optional(),
  allowRetake: z.boolean().optional(),
  requireNameEmail: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const exam = await prisma.exam.findFirst({
    where: { id, userId: userId! },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      sources: true,
      shareLinks: { where: { isActive: true } },
      _count: { select: { attempts: true } },
    },
  });

  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  try {
    const existing = await prisma.exam.findFirst({ where: { id, userId: userId! } });
    if (!existing) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const body = await req.json();
    const data = updateSchema.parse(body);

    const questions = await prisma.examQuestion.findMany({ where: { examId: id } });
    const totalPoints = questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0);

    const updateData = {
      ...data,
      totalPoints,
      metadata: data.metadata ? toJson(data.metadata) : undefined,
    };

    const exam = await prisma.exam.update({
      where: { id },
      data: updateData,
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        shareLinks: { where: { isActive: true } },
        _count: { select: { attempts: true } },
      },
    });

    return NextResponse.json(exam);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return apiError("Failed to update exam");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.exam.findFirst({ where: { id, userId: userId! } });
  if (!existing) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

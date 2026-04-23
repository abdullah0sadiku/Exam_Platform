import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  try {
    const exam = await prisma.exam.findFirst({ where: { id, userId: userId! } });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    const questions = await prisma.examQuestion.findMany({ where: { examId: id } });
    if (questions.length === 0) {
      return NextResponse.json({ error: "Exam must have at least one question to publish" }, { status: 400 });
    }

    // Create share link if none exists
    let shareLink = await prisma.shareLink.findFirst({ where: { examId: id, isActive: true } });
    if (!shareLink) {
      shareLink = await prisma.shareLink.create({ data: { examId: id } });
    }

    const totalPoints = questions.reduce((s: number, q: { points: number }) => s + q.points, 0);
    const updated = await prisma.exam.update({
      where: { id },
      data: { status: "PUBLISHED", totalPoints },
    });

    return NextResponse.json({ exam: updated, shareLink });
  } catch {
    return apiError("Failed to publish exam");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const exam = await prisma.exam.findFirst({ where: { id, userId: userId! } });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  await prisma.exam.update({ where: { id }, data: { status: "DRAFT" } });
  return NextResponse.json({ success: true });
}

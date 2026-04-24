import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreAttempt } from "@/lib/scoring";
import { toJson } from "@/lib/utils";
import { z } from "zod";

const startSchema = z.object({
  examId: z.string(),
  shareLinkId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
});

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.unknown(),
  })),
  durationSeconds: z.number().optional(),
});

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "start";

  if (action === "start") return handleStart(req);
  if (action === "submit") return handleSubmit(req);
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function handleStart(req: Request) {
  try {
    const body = await req.json();
    const { examId, shareLinkId, name, email } = startSchema.parse(body);

    // Verify share link
    const shareLink = await prisma.shareLink.findUnique({ where: { id: shareLinkId } });
    if (!shareLink || !shareLink.isActive) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Exam not available" }, { status: 400 });
    }

    // Upsert candidate
    const candidate = await prisma.candidate.upsert({
      where: { email },
      create: { name, email },
      update: { name },
    });

    // Check if already has a submitted attempt (if retake not allowed)
    if (!exam.allowRetake) {
      const existing = await prisma.examAttempt.findFirst({
        where: { examId, candidateId: candidate.id, status: "SUBMITTED" },
      });
      if (existing) {
        return NextResponse.json({ error: "You have already completed this exam and retakes are not allowed." }, { status: 403 });
      }
    }

    const attempt = await prisma.examAttempt.create({
      data: { examId, candidateId: candidate.id, shareLinkId },
    });

    return NextResponse.json({ attemptId: attempt.id, candidateId: candidate.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to start attempt" }, { status: 500 });
  }
}

async function handleSubmit(req: Request) {
  try {
    const body = await req.json();
    const { attemptId, answers, durationSeconds } = submitSchema.parse(body);

    const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status === "SUBMITTED") return NextResponse.json({ error: "Already submitted" }, { status: 400 });

    const exam = await prisma.exam.findUnique({
      where: { id: attempt.examId },
      include: { questions: true },
    });
    if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

    // Score attempt
    const scored = scoreAttempt(
      exam.questions.map((q) => ({
        id: q.id,
        examId: q.examId,
        questionText: q.questionText,
        options: q.options as string[],
        correctAnswer: q.correctAnswer as string | string[],
        questionType: q.questionType as "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "SHORT_ANSWER" | "OPEN_ENDED" | "FILL_IN_BLANK",
        difficulty: q.difficulty as "EASY" | "MEDIUM" | "HARD" | "MIXED",
        explanation: q.explanation ?? undefined,
        topicTag: q.topicTag ?? undefined,
        sourceReference: q.sourceReference ?? undefined,
        points: q.points,
        orderIndex: q.orderIndex,
        metadata: q.metadata as Record<string, unknown>,
      })),
      answers as { questionId: string; answer: unknown }[]
    );

    // Save answers
    await prisma.attemptAnswer.createMany({
      data: scored.answers.map((a) => ({
        attemptId,
        questionId: a.questionId,
        answer: a.answer as string,
        isCorrect: a.isCorrect,
        awardedPoints: a.awardedPoints,
      })),
    });

    // Update attempt
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        score: scored.score,
        percentage: scored.percentage,
        submittedAt: new Date(),
        durationSeconds: durationSeconds || 0,
        resultSummary: toJson(scored.resultSummary),
      },
    });

    // Results are always persisted server-side, but only returned to the
    // candidate when the exam author has opted in to show them immediately.
    // Otherwise strip score/pass/summary so the candidate can't read them
    // via devtools on the submit response.
    if (!exam.showResultsImmediately) {
      return NextResponse.json({
        submitted: true,
        showResults: false,
        attemptId: updated.id,
      });
    }

    const passed = scored.percentage >= exam.passingScore;

    return NextResponse.json({
      submitted: true,
      score: scored.score,
      totalPoints: scored.totalPoints,
      percentage: scored.percentage,
      passed,
      passingScore: exam.passingScore,
      showResults: true,
      showExplanations: exam.showExplanations,
      resultSummary: scored.resultSummary,
      attemptId: updated.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}

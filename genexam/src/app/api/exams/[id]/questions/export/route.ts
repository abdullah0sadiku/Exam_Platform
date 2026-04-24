import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";
import { generateSlug } from "@/lib/utils";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toDisplay(v: unknown): string {
  if (Array.isArray(v)) return (v as unknown[]).map(String).join(" | ");
  if (v === null || v === undefined) return "";
  return String(v);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "json").toLowerCase();

  const exam = await prisma.exam.findFirst({
    where: { id, userId: userId! },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const slug = generateSlug(exam.title) || "exam";

  if (format === "csv") {
    const header = [
      "orderIndex",
      "questionText",
      "questionType",
      "difficulty",
      "topicTag",
      "points",
      "options",
      "correctAnswer",
      "explanation",
    ];
    const rows = exam.questions.map((q) => [
      q.orderIndex,
      q.questionText,
      q.questionType,
      q.difficulty,
      q.topicTag ?? "",
      q.points,
      toDisplay(q.options),
      toDisplay(q.correctAnswer),
      q.explanation ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}-questions.csv"`,
      },
    });
  }

  if (format !== "json") {
    return NextResponse.json({ error: "Unsupported format. Use json or csv." }, { status: 400 });
  }

  const payload = {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    totalPoints: exam.totalPoints,
    questions: exam.questions.map((q) => ({
      orderIndex: q.orderIndex,
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topicTag: q.topicTag,
      points: q.points,
    })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-questions.json"`,
    },
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sourceType: z.enum(["DOCUMENT", "TOPIC"]).default("TOPIC"),
});

export async function GET(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const exams = await prisma.exam.findMany({
    where: {
      userId: userId!,
      ...(status && { status }),
      ...(search && { title: { contains: search, mode: "insensitive" } }),
    },
    include: {
      _count: { select: { questions: true, attempts: true } },
      shareLinks: { where: { isActive: true }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(exams);
}

export async function POST(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const exam = await prisma.exam.create({
      data: { ...data, userId: userId! },
      include: { _count: { select: { questions: true, attempts: true } } },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return apiError("Failed to create exam");
  }
}

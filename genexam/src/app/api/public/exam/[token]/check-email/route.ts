import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      exam: { select: { id: true, allowRetake: true, status: true } },
    },
  });

  if (!shareLink || !shareLink.isActive || shareLink.exam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const candidate = await prisma.candidate.findUnique({ where: { email } });

  if (!candidate) {
    return NextResponse.json({ hasAttempt: false, allowRetake: shareLink.exam.allowRetake });
  }

  const existing = await prisma.examAttempt.findFirst({
    where: {
      examId: shareLink.exam.id,
      candidateId: candidate.id,
      status: "SUBMITTED",
    },
  });

  return NextResponse.json({
    hasAttempt: !!existing,
    allowRetake: shareLink.exam.allowRetake,
  });
}

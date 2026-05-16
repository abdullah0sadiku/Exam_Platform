import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");

  const logs = await prisma.generationLog.findMany({
    where: { userId: userId!, ...(examId && { examId }) },
    include: {
      providerConfig: { select: { label: true, providerType: true, modelName: true } },
      exam: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const sanitized = logs.map((log: (typeof logs)[number]) => ({
    ...log,
    requestPayload: sanitizePayload(log.requestPayload),
  }));

  return NextResponse.json(sanitized);
}

function sanitizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const obj = { ...(payload as Record<string, unknown>) };
  delete obj.apiKey;
  delete obj.encryptedApiKey;
  return obj;
}

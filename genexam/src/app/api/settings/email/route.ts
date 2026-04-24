import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { encryptApiKey } from "@/lib/crypto";
import { z } from "zod";

const upsertSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  username: z.string().optional().nullable(),
  // password is optional on update: omitting it keeps the existing one
  password: z.string().optional().nullable(),
  fromAddress: z.string().email(),
});

function publicView(cfg: {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  fromAddress: string;
  encryptedPassword: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: cfg.id,
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    username: cfg.username,
    fromAddress: cfg.fromAddress,
    hasPassword: Boolean(cfg.encryptedPassword),
    createdAt: cfg.createdAt,
    updatedAt: cfg.updatedAt,
  };
}

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const cfg = await prisma.userEmailConfig.findUnique({ where: { userId: userId! } });
  const envFallback = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);

  return NextResponse.json({
    config: cfg ? publicView(cfg) : null,
    envFallback,
  });
}

export async function PUT(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = upsertSchema.parse(body);

    const existing = await prisma.userEmailConfig.findUnique({ where: { userId: userId! } });

    // If password is an empty string, treat as "clear it". If omitted / null, keep existing.
    let encryptedPassword: string | null | undefined;
    if (data.password === undefined || data.password === null) {
      encryptedPassword = existing?.encryptedPassword ?? null;
    } else if (data.password === "") {
      encryptedPassword = null;
    } else {
      encryptedPassword = encryptApiKey(data.password);
    }

    const cfg = await prisma.userEmailConfig.upsert({
      where: { userId: userId! },
      create: {
        userId: userId!,
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username ?? null,
        encryptedPassword,
        fromAddress: data.fromAddress,
      },
      update: {
        host: data.host,
        port: data.port,
        secure: data.secure,
        username: data.username ?? null,
        encryptedPassword,
        fromAddress: data.fromAddress,
      },
    });

    return NextResponse.json(publicView(cfg));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/settings/email PUT] failed:", err);
    return apiError(`Failed to save email config: ${msg}`, 500);
  }
}

export async function DELETE() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    await prisma.userEmailConfig.deleteMany({ where: { userId: userId! } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/settings/email DELETE] failed:", err);
    return apiError(`Failed to delete email config: ${msg}`, 500);
  }
}

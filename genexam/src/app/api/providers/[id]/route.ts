import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { encryptApiKey } from "@/lib/crypto";
import { maskApiKey } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).optional(),
  apiKey: z.string().min(1).optional(),
  modelName: z.string().min(1).optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(256).optional(),
  systemPrompt: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  try {
    const existing = await prisma.aIProviderConfig.findFirst({ where: { id, userId: userId! } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = updateSchema.parse(body);

    if (data.isDefault) {
      await prisma.aIProviderConfig.updateMany({
        where: { userId: userId! },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.aIProviderConfig.update({
      where: { id },
      data: {
        ...(data.label && { label: data.label }),
        ...(data.apiKey && { encryptedApiKey: encryptApiKey(data.apiKey) }),
        ...(data.modelName && { modelName: data.modelName }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
        ...(data.temperature !== undefined && { temperature: data.temperature }),
        ...(data.maxTokens !== undefined && { maxTokens: data.maxTokens }),
        ...(data.systemPrompt !== undefined && { systemPrompt: data.systemPrompt }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      },
    });

    return NextResponse.json({ ...updated, encryptedApiKey: maskApiKey(updated.encryptedApiKey) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return apiError("Failed to update provider config");
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.aIProviderConfig.findFirst({ where: { id, userId: userId! } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aIProviderConfig.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Set as default
  const { error, userId } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const existing = await prisma.aIProviderConfig.findFirst({ where: { id, userId: userId! } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aIProviderConfig.updateMany({ where: { userId: userId! }, data: { isDefault: false } });
  await prisma.aIProviderConfig.update({ where: { id }, data: { isDefault: true } });

  return NextResponse.json({ success: true });
}

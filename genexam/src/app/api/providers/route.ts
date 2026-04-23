import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { encryptApiKey } from "@/lib/crypto";
import { maskApiKey } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  providerType: z.enum(["openai", "databricks", "custom"]),
  label: z.string().min(1),
  apiKey: z.string().min(1),
  modelName: z.string().min(1),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(256).max(32000).optional(),
  systemPrompt: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const configs = await prisma.aIProviderConfig.findMany({
    where: { userId: userId! },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    configs.map((c) => ({ ...c, encryptedApiKey: maskApiKey(c.encryptedApiKey) }))
  );
}

export async function POST(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    if (data.isDefault) {
      await prisma.aIProviderConfig.updateMany({
        where: { userId: userId! },
        data: { isDefault: false },
      });
    }

    const config = await prisma.aIProviderConfig.create({
      data: {
        userId: userId!,
        providerType: data.providerType,
        label: data.label,
        encryptedApiKey: encryptApiKey(data.apiKey),
        modelName: data.modelName,
        baseUrl: data.baseUrl,
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 4096,
        systemPrompt: data.systemPrompt,
        isDefault: data.isDefault ?? false,
      },
    });

    return NextResponse.json({ ...config, encryptedApiKey: maskApiKey(config.encryptedApiKey) }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    return apiError("Failed to create provider config");
  }
}

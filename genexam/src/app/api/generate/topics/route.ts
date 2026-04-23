import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { decryptApiKey } from "@/lib/crypto";
import { toJson } from "@/lib/utils";
import { getAdapter, PROMPT_VERSION } from "@/lib/ai";
import { z } from "zod";
import type { TopicGenerationInput, ProviderType } from "@/types";

const schema = z.object({
  providerConfigId: z.string().optional(),
  examId: z.string().optional(),
  title: z.string().min(1),
  topic: z.string().min(1),
  subtopics: z.string().optional(),
  targetAudience: z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]).default("MEDIUM"),
  questionCount: z.number().min(1).max(100).default(10),
  questionTypes: z.array(z.enum(["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "SHORT_ANSWER", "OPEN_ENDED", "FILL_IN_BLANK"])).default(["MULTIPLE_CHOICE"]),
  timeLimitMinutes: z.number().optional(),
  language: z.string().default("English"),
  includeExplanations: z.boolean().default(true),
  customInstructions: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const data = schema.parse(body);

    let providerConfig = data.providerConfigId
      ? await prisma.aIProviderConfig.findFirst({ where: { id: data.providerConfigId, userId: userId! } })
      : await prisma.aIProviderConfig.findFirst({ where: { userId: userId!, isDefault: true } });

    if (!providerConfig) {
      providerConfig = await prisma.aIProviderConfig.findFirst({ where: { userId: userId! } });
    }

    if (!providerConfig) {
      return NextResponse.json({ error: "No AI provider configured. Please add a provider in Settings." }, { status: 400 });
    }

    const adapterConfig = {
      apiKey: decryptApiKey(providerConfig.encryptedApiKey),
      modelName: providerConfig.modelName,
      baseUrl: providerConfig.baseUrl || undefined,
      temperature: providerConfig.temperature,
      maxTokens: providerConfig.maxTokens,
      systemPrompt: providerConfig.systemPrompt || undefined,
    };

    const input: TopicGenerationInput = {
      title: data.title,
      topic: data.topic,
      subtopics: data.subtopics,
      targetAudience: data.targetAudience,
      difficulty: data.difficulty,
      questionCount: data.questionCount,
      questionTypes: data.questionTypes,
      timeLimitMinutes: data.timeLimitMinutes,
      language: data.language,
      includeExplanations: data.includeExplanations,
      customInstructions: data.customInstructions,
    };

    const adapter = getAdapter(providerConfig.providerType as ProviderType);

    const logEntry = await prisma.generationLog.create({
      data: {
        userId: userId!,
        providerConfigId: providerConfig.id,
        generationMode: "TOPIC",
        promptVersion: PROMPT_VERSION,
        status: "RUNNING",
        requestPayload: toJson(input),
      },
    });
    const logId = logEntry.id;

    try {
      const result = await adapter.generateFromTopics(input, adapterConfig);

      let examId = data.examId;
      if (!examId) {
        const exam = await prisma.exam.create({
          data: {
            userId: userId!,
            title: result.exam.title,
            description: result.exam.description,
            instructions: result.exam.instructions,
            sourceType: "TOPIC",
            durationMinutes: result.exam.metadata.estimatedDuration,
            metadata: toJson(result.exam.metadata),
          },
        });
        examId = exam.id;

        await prisma.examSource.create({
          data: {
            examId,
            sourceType: "TOPIC",
            sourceMetadata: toJson(input),
          },
        });
      }

      await prisma.examQuestion.deleteMany({ where: { examId } });
      await prisma.examQuestion.createMany({
        data: result.exam.questions.map((q, i) => ({
          examId: examId!,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.correctAnswer as string,
          explanation: q.explanation || "",
          difficulty: q.difficulty,
          topicTag: q.topicTag || "",
          sourceReference: q.sourceReference,
          points: q.points,
          orderIndex: i,
        })),
      });

      const totalPoints = result.exam.questions.reduce((s: number, q: { points: number }) => s + q.points, 0);
      await prisma.exam.update({ where: { id: examId }, data: { totalPoints } });

      await prisma.generationLog.update({
        where: { id: logId },
        data: {
          examId,
          status: "SUCCESS",
          tokenUsage: toJson(result.tokenUsage),
          responsePayload: toJson({ questionCount: result.exam.questions.length }),
        },
      });

      return NextResponse.json({ examId, questionCount: result.exam.questions.length });
    } catch (genErr) {
      await prisma.generationLog.update({
        where: { id: logId },
        data: {
          status: "FAILED",
          errorMessage: genErr instanceof Error ? genErr.message : "Unknown error",
        },
      });
      throw genErr;
    }
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    const msg = err instanceof Error ? err.message : "Generation failed";
    return apiError(msg);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { decryptApiKey } from "@/lib/crypto";
import { toJson } from "@/lib/utils";
import { getAdapter, PROMPT_VERSION } from "@/lib/ai";
import { parseDocument } from "@/lib/document/parser";
import { cleanText } from "@/lib/document/chunker";
import type { DocumentGenerationInput, ProviderType } from "@/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(req: Request) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx|txt|md)$/i)) {
      return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, or TXT." }, { status: 400 });
    }

    const questionCount = Number(formData.get("questionCount")) || 10;
    const difficulty = (formData.get("difficulty") as string) || "MEDIUM";
    const questionTypesRaw = formData.get("questionTypes") as string;
    const questionTypes = questionTypesRaw ? JSON.parse(questionTypesRaw) : ["MULTIPLE_CHOICE"];
    const includeExplanations = formData.get("includeExplanations") !== "false";
    const strictGrounding = formData.get("strictGrounding") !== "false";
    const customInstructions = formData.get("customInstructions") as string | null;
    const providerConfigId = formData.get("providerConfigId") as string | null;

    // Parse document
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDocument(buffer, file.type, file.name);
    const cleanedText = cleanText(parsed.text);

    if (cleanedText.length < 100) {
      return NextResponse.json({ error: "Document appears to be empty or unreadable" }, { status: 400 });
    }

    // Get provider
    let providerConfig = providerConfigId
      ? await prisma.aIProviderConfig.findFirst({ where: { id: providerConfigId, userId: userId! } })
      : await prisma.aIProviderConfig.findFirst({ where: { userId: userId!, isDefault: true } });

    if (!providerConfig) {
      providerConfig = await prisma.aIProviderConfig.findFirst({ where: { userId: userId! } });
    }

    if (!providerConfig) {
      return NextResponse.json({ error: "No AI provider configured." }, { status: 400 });
    }

    const adapterConfig = {
      apiKey: decryptApiKey(providerConfig.encryptedApiKey),
      modelName: providerConfig.modelName,
      baseUrl: providerConfig.baseUrl || undefined,
      temperature: providerConfig.temperature,
      maxTokens: providerConfig.maxTokens,
      systemPrompt: providerConfig.systemPrompt || undefined,
    };

    const input: DocumentGenerationInput = {
      extractedText: cleanedText,
      fileName: file.name,
      questionCount,
      questionTypes,
      difficulty: difficulty as DocumentGenerationInput["difficulty"],
      includeExplanations,
      strictGrounding,
      customInstructions: customInstructions || undefined,
    };

    const adapter = getAdapter(providerConfig.providerType as ProviderType);

    const logEntry = await prisma.generationLog.create({
      data: {
        userId: userId!,
        providerConfigId: providerConfig.id,
        generationMode: "DOCUMENT",
        promptVersion: PROMPT_VERSION,
        status: "RUNNING",
        requestPayload: { fileName: file.name, questionCount, difficulty },
      },
    });

    try {
      const result = await adapter.generateFromDocument(input, adapterConfig);

      // Create exam
      const exam = await prisma.exam.create({
        data: {
          userId: userId!,
          title: result.exam.title,
          description: result.exam.description,
          instructions: result.exam.instructions,
          sourceType: "DOCUMENT",
          durationMinutes: result.exam.metadata.estimatedDuration,
          metadata: toJson(result.exam.metadata),
        },
      });

      // Save source
      await prisma.examSource.create({
        data: {
          examId: exam.id,
          sourceType: "DOCUMENT",
          fileName: file.name,
          extractedText: cleanedText,
          sourceMetadata: toJson({ pages: parsed.pageCount, fileSize: file.size }),
        },
      });

      // Save questions
      await prisma.examQuestion.createMany({
        data: result.exam.questions.map((q, i) => ({
          examId: exam.id,
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
      await prisma.exam.update({ where: { id: exam.id }, data: { totalPoints } });

      await prisma.generationLog.update({
        where: { id: logEntry.id },
        data: {
          examId: exam.id,
          status: "SUCCESS",
          tokenUsage: toJson(result.tokenUsage),
          responsePayload: toJson({ questionCount: result.exam.questions.length }),
        },
      });

      return NextResponse.json({ examId: exam.id, questionCount: result.exam.questions.length });
    } catch (genErr) {
      await prisma.generationLog.update({
        where: { id: logEntry.id },
        data: {
          status: "FAILED",
          errorMessage: genErr instanceof Error ? genErr.message : "Unknown error",
        },
      });
      throw genErr;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Document generation failed";
    return apiError(msg);
  }
}

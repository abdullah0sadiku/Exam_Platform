import OpenAI from "openai";
import type { IProviderAdapter, ProviderAdapterConfig, GenerationResult, TokenUsage } from "../types";
import type { TopicGenerationInput, DocumentGenerationInput } from "@/types";
import { buildTopicPrompt, buildDocumentPrompt, buildRegenerateQuestionPrompt, PROMPT_VERSION } from "../prompts";
import { parseGeneratedExam } from "../parser";
import type { QuestionRegenerationInput } from "../types";
import type { GeneratedQuestion } from "@/types";

export class OpenAIAdapter implements IProviderAdapter {
  async generateFromTopics(
    input: TopicGenerationInput,
    config: ProviderAdapterConfig
  ): Promise<GenerationResult> {
    const client = this.createClient(config);
    const prompt = buildTopicPrompt(input);

    const response = await client.chat.completions.create({
      model: config.modelName || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            config.systemPrompt ||
            "You are an expert educational assessment creator. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "";
    const exam = parseGeneratedExam(raw);
    const tokenUsage = this.extractUsage(response.usage);

    return { exam, tokenUsage, rawResponse: raw };
  }

  async generateFromDocument(
    input: DocumentGenerationInput,
    config: ProviderAdapterConfig
  ): Promise<GenerationResult> {
    const client = this.createClient(config);
    const prompt = buildDocumentPrompt(input);

    const response = await client.chat.completions.create({
      model: config.modelName || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            config.systemPrompt ||
            "You are an expert educational assessment creator. Generate exams strictly grounded in provided documents. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: config.temperature ?? 0.3,
      max_tokens: config.maxTokens ?? 4096,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "";
    const exam = parseGeneratedExam(raw);
    const tokenUsage = this.extractUsage(response.usage);

    return { exam, tokenUsage, rawResponse: raw };
  }

  async regenerateQuestion(
    input: QuestionRegenerationInput,
    config: ProviderAdapterConfig
  ): Promise<{ question: GeneratedQuestion; tokenUsage: TokenUsage }> {
    const client = this.createClient(config);
    const prompt = buildRegenerateQuestionPrompt(
      input.question.questionText,
      input.instruction,
      input.context
    );

    const response = await client.chat.completions.create({
      model: config.modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert exam question editor. Always respond with valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: config.temperature ?? 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const q = JSON.parse(raw) as GeneratedQuestion;
    const tokenUsage = this.extractUsage(response.usage);

    return { question: q, tokenUsage };
  }

  private createClient(config: ProviderAdapterConfig): OpenAI {
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
    });
  }

  private extractUsage(usage: OpenAI.CompletionUsage | undefined): TokenUsage {
    return {
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
    };
  }
}

export const PROMPT_VERSION_EXPORT = PROMPT_VERSION;

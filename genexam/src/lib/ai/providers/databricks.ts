import type { IProviderAdapter, ProviderAdapterConfig, GenerationResult, TokenUsage, QuestionRegenerationInput } from "../types";
import type { TopicGenerationInput, DocumentGenerationInput, GeneratedQuestion } from "@/types";
import { buildTopicPrompt, buildDocumentPrompt, buildRegenerateQuestionPrompt } from "../prompts";
import { parseGeneratedExam } from "../parser";

export class DatabricksAdapter implements IProviderAdapter {
  async generateFromTopics(
    input: TopicGenerationInput,
    config: ProviderAdapterConfig
  ): Promise<GenerationResult> {
    const prompt = buildTopicPrompt(input);
    return this.callDatabricks(prompt, config);
  }

  async generateFromDocument(
    input: DocumentGenerationInput,
    config: ProviderAdapterConfig
  ): Promise<GenerationResult> {
    const prompt = buildDocumentPrompt(input);
    return this.callDatabricks(prompt, config, 0.3);
  }

  async regenerateQuestion(
    input: QuestionRegenerationInput,
    config: ProviderAdapterConfig
  ): Promise<{ question: GeneratedQuestion; tokenUsage: TokenUsage }> {
    const prompt = buildRegenerateQuestionPrompt(
      input.question.questionText,
      input.instruction,
      input.context
    );

    const baseUrl = config.baseUrl || "https://your-workspace.azuredatabricks.net";
    const url = `${baseUrl}/serving-endpoints/${config.modelName}/invocations`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: config.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Databricks API error: ${err}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const raw = data.choices?.[0]?.message?.content || "{}";
    const q = JSON.parse(raw) as GeneratedQuestion;
    const tokenUsage = this.extractUsage(data.usage);

    return { question: q, tokenUsage };
  }

  private async callDatabricks(
    prompt: string,
    config: ProviderAdapterConfig,
    temperatureOverride?: number
  ): Promise<GenerationResult> {
    const baseUrl = config.baseUrl || "https://your-workspace.azuredatabricks.net";
    const url = `${baseUrl}/serving-endpoints/${config.modelName}/invocations`;

    const systemPrompt =
      config.systemPrompt ||
      "You are an expert educational assessment creator. Always respond with valid JSON.";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: config.maxTokens ?? 4096,
        temperature: temperatureOverride ?? config.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Databricks API error: ${err}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const raw = data.choices?.[0]?.message?.content || "";
    const exam = parseGeneratedExam(raw);
    const tokenUsage = this.extractUsage(data.usage);

    return { exam, tokenUsage, rawResponse: raw };
  }

  private extractUsage(usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }): TokenUsage {
    return {
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
    };
  }
}

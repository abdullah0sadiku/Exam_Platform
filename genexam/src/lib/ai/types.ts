import type {
  GeneratedExam,
  TopicGenerationInput,
  DocumentGenerationInput,
  GeneratedQuestion,
} from "@/types";

export interface ProviderAdapterConfig {
  apiKey: string;
  modelName: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface GenerationResult {
  exam: GeneratedExam;
  tokenUsage: TokenUsage;
  rawResponse?: string;
}

export interface QuestionRegenerationInput {
  question: GeneratedQuestion;
  instruction: string;
  context?: string;
}

export interface IProviderAdapter {
  generateFromTopics(
    input: TopicGenerationInput,
    config: ProviderAdapterConfig
  ): Promise<GenerationResult>;

  generateFromDocument(
    input: DocumentGenerationInput,
    config: ProviderAdapterConfig
  ): Promise<GenerationResult>;

  regenerateQuestion(
    input: QuestionRegenerationInput,
    config: ProviderAdapterConfig
  ): Promise<{ question: GeneratedQuestion; tokenUsage: TokenUsage }>;
}

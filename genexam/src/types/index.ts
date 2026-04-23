export type ExamStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SourceType = "DOCUMENT" | "TOPIC";
export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_SELECT"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "OPEN_ENDED"
  | "FILL_IN_BLANK";
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";
export type AttemptStatus = "STARTED" | "SUBMITTED" | "ABANDONED";
export type ProviderType = "openai" | "databricks" | "custom";

export interface ExamQuestion {
  id: string;
  examId: string;
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string | string[];
  explanation?: string;
  difficulty: Difficulty;
  topicTag?: string;
  sourceReference?: string;
  points: number;
  orderIndex: number;
  metadata: Record<string, unknown>;
}

export interface ExamWithDetails {
  id: string;
  userId: string;
  title: string;
  description?: string;
  sourceType: SourceType;
  status: ExamStatus;
  instructions?: string;
  durationMinutes?: number;
  passingScore: number;
  totalPoints: number;
  showResultsImmediately: boolean;
  showExplanations: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  allowRetake: boolean;
  requireNameEmail: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  questions: ExamQuestion[];
  _count?: { attempts: number };
}

export interface ProviderConfig {
  id: string;
  userId: string;
  providerType: ProviderType;
  label: string;
  modelName: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  isDefault: boolean;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedExam {
  title: string;
  description: string;
  instructions: string;
  questions: GeneratedQuestion[];
  metadata: {
    topics: string[];
    difficulty: Difficulty;
    estimatedDuration: number;
  };
}

export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string | string[];
  explanation: string;
  difficulty: Difficulty;
  topicTag: string;
  sourceReference?: string;
  points: number;
}

export interface TopicGenerationInput {
  title: string;
  topic: string;
  subtopics?: string;
  targetAudience?: string;
  difficulty: Difficulty;
  questionCount: number;
  questionTypes: QuestionType[];
  timeLimitMinutes?: number;
  language?: string;
  includeExplanations: boolean;
  customInstructions?: string;
}

export interface DocumentGenerationInput {
  extractedText: string;
  fileName: string;
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: Difficulty;
  includeExplanations: boolean;
  strictGrounding: boolean;
  customInstructions?: string;
}

export interface AttemptWithDetails {
  id: string;
  examId: string;
  candidateId: string;
  status: AttemptStatus;
  score?: number;
  percentage?: number;
  startedAt: Date;
  submittedAt?: Date;
  durationSeconds?: number;
  resultSummary: Record<string, unknown>;
  candidate: { name: string; email: string };
  answers: {
    questionId: string;
    answer: unknown;
    isCorrect: boolean;
    awardedPoints: number;
  }[];
}

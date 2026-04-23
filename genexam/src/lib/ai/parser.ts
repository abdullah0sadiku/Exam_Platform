import type { GeneratedExam, GeneratedQuestion } from "@/types";

export function parseGeneratedExam(raw: string): GeneratedExam {
  const cleaned = cleanJsonString(raw);
  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No valid JSON found in AI response");
    parsed = JSON.parse(jsonMatch[0]);
  }

  return validateAndNormalizeExam(parsed);
}

function cleanJsonString(raw: string): string {
  return raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

function validateAndNormalizeExam(data: unknown): GeneratedExam {
  const d = data as Record<string, unknown>;

  if (!d.questions || !Array.isArray(d.questions)) {
    throw new Error("AI response missing questions array");
  }

  const questions: GeneratedQuestion[] = (d.questions as unknown[]).map(
    (q, i) => normalizeQuestion(q, i)
  );

  const meta = d.metadata as Record<string, unknown> | undefined;
  return {
    title: String(d.title || "Generated Exam"),
    description: String(d.description || ""),
    instructions: String(d.instructions || "Answer all questions carefully."),
    questions,
    metadata: {
      topics: Array.isArray(meta?.topics) ? (meta!.topics as string[]) : [],
      difficulty: (meta?.difficulty as "EASY" | "MEDIUM" | "HARD" | "MIXED") || "MEDIUM",
      estimatedDuration: Number(meta?.estimatedDuration) || questions.length * 2,
    },
  };
}

function normalizeQuestion(raw: unknown, index: number): GeneratedQuestion {
  const q = raw as Record<string, unknown>;

  const validTypes = [
    "MULTIPLE_CHOICE",
    "MULTIPLE_SELECT",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "OPEN_ENDED",
    "FILL_IN_BLANK",
  ];

  const questionType = validTypes.includes(String(q.questionType))
    ? (String(q.questionType) as GeneratedQuestion["questionType"])
    : "MULTIPLE_CHOICE";

  const validDifficulties = ["EASY", "MEDIUM", "HARD"];
  const difficulty = validDifficulties.includes(String(q.difficulty))
    ? (String(q.difficulty) as GeneratedQuestion["difficulty"])
    : "MEDIUM";

  const options = Array.isArray(q.options)
    ? (q.options as unknown[]).map(String)
    : [];

  let correctAnswer: string | string[] = "";
  if (Array.isArray(q.correctAnswer)) {
    correctAnswer = (q.correctAnswer as unknown[]).map(String);
  } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
    correctAnswer = String(q.correctAnswer);
  }

  return {
    questionText: String(q.questionText || `Question ${index + 1}`),
    questionType,
    options,
    correctAnswer,
    explanation: String(q.explanation || ""),
    difficulty,
    topicTag: String(q.topicTag || ""),
    sourceReference: q.sourceReference ? String(q.sourceReference) : undefined,
    points: Number(q.points) || 1,
  };
}

import type { ExamQuestion } from "@/types";

interface AnswerSubmission {
  questionId: string;
  answer: unknown;
}

interface ScoredAnswer {
  questionId: string;
  answer: unknown;
  isCorrect: boolean;
  awardedPoints: number;
}

interface ScoreResult {
  score: number;
  totalPoints: number;
  percentage: number;
  answers: ScoredAnswer[];
  resultSummary: {
    correct: number;
    incorrect: number;
    skipped: number;
    byDifficulty: Record<string, { correct: number; total: number }>;
    byTopic: Record<string, { correct: number; total: number }>;
  };
}

export function scoreAttempt(
  questions: ExamQuestion[],
  submissions: AnswerSubmission[]
): ScoreResult {
  const submissionMap = new Map(submissions.map((s) => [s.questionId, s.answer]));
  const answers: ScoredAnswer[] = [];
  let score = 0;
  let totalPoints = 0;
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  const byDifficulty: Record<string, { correct: number; total: number }> = {};
  const byTopic: Record<string, { correct: number; total: number }> = {};

  for (const question of questions) {
    totalPoints += question.points;
    const submitted = submissionMap.get(question.id);
    const diff = question.difficulty;
    const topic = question.topicTag || "General";

    if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0 };
    if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
    byDifficulty[diff].total++;
    byTopic[topic].total++;

    if (submitted === undefined || submitted === null || submitted === "") {
      skipped++;
      answers.push({ questionId: question.id, answer: submitted, isCorrect: false, awardedPoints: 0 });
      continue;
    }

    const isCorrect = checkAnswer(question, submitted);
    const awardedPoints = isCorrect ? question.points : 0;

    if (isCorrect) {
      correct++;
      score += awardedPoints;
      byDifficulty[diff].correct++;
      byTopic[topic].correct++;
    } else {
      incorrect++;
    }

    answers.push({ questionId: question.id, answer: submitted, isCorrect, awardedPoints });
  }

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  return {
    score,
    totalPoints,
    percentage,
    answers,
    resultSummary: { correct, incorrect, skipped, byDifficulty, byTopic },
  };
}

function checkAnswer(question: ExamQuestion, submitted: unknown): boolean {
  const correct = question.correctAnswer;

  switch (question.questionType) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "FILL_IN_BLANK": {
      const s = normalize(String(submitted));
      const c = normalize(String(correct));
      if (s === c) return true;
      // AI may store just the letter label ("a") while the UI submits the full
      // option text ("a. paris"). Match if the letter prefix agrees.
      const sLetter = extractLabel(s);
      const cLetter = extractLabel(c);
      if (sLetter && cLetter) return sLetter === cLetter;
      // One side is a label, the other is the full option — check prefix
      if (cLetter && s.startsWith(cLetter + ".")) return true;
      if (sLetter && c.startsWith(sLetter + ".")) return true;
      return false;
    }

    case "MULTIPLE_SELECT": {
      const toArr = (v: unknown) =>
        Array.isArray(v) ? v.map((x) => normalize(String(x))) : [normalize(String(v))];

      const submittedArr = toArr(submitted).sort();
      const correctArr = toArr(correct).sort();

      if (JSON.stringify(submittedArr) === JSON.stringify(correctArr)) return true;

      // Normalise both sides to just letter labels for comparison
      const sLabels = submittedArr.map((x) => extractLabel(x) ?? x).sort();
      const cLabels = correctArr.map((x) => extractLabel(x) ?? x).sort();
      return JSON.stringify(sLabels) === JSON.stringify(cLabels);
    }

    case "SHORT_ANSWER":
    case "OPEN_ENDED":
      return (
        normalize(String(submitted)).includes(normalize(String(correct))) ||
        normalize(String(correct)).includes(normalize(String(submitted)))
      );

    default:
      return false;
  }
}

// Returns the single letter label if the string is just a label ("a", "b" …)
// or starts with one ("a. text" → "a"). Returns null otherwise.
function extractLabel(s: string): string | null {
  const m = s.match(/^([a-e])(\..*)?$/);
  return m ? m[1] : null;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

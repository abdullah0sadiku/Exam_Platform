import type { TopicGenerationInput, DocumentGenerationInput, QuestionType, Difficulty } from "@/types";

export const PROMPT_VERSION = "1.0";

function questionTypeInstructions(types: QuestionType[]): string {
  const map: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: "Multiple choice (single correct answer, 4 options labeled A-D)",
    MULTIPLE_SELECT: "Multiple select (2-3 correct answers, 4-5 options)",
    TRUE_FALSE: 'True/False (correct answer must be "True" or "False")',
    SHORT_ANSWER: "Short answer (1-3 sentence expected answer)",
    OPEN_ENDED: "Open-ended (paragraph-length expected answer)",
    FILL_IN_BLANK: 'Fill in the blank (question contains "___", answer fills it)',
  };
  return types.map((t) => `- ${map[t]}`).join("\n");
}

export function buildTopicPrompt(input: TopicGenerationInput): string {
  return `You are an expert exam creator. Generate a high-quality exam based on the following specifications.

EXAM SPECIFICATIONS:
- Title: ${input.title}
- Topic: ${input.topic}
- Subtopics: ${input.subtopics || "Cover the topic broadly"}
- Target Audience: ${input.targetAudience || "General learners"}
- Difficulty: ${input.difficulty}
- Number of Questions: ${input.questionCount}
- Time Limit: ${input.timeLimitMinutes ? `${input.timeLimitMinutes} minutes` : "No limit"}
- Language: ${input.language || "English"}
- Include Explanations: ${input.includeExplanations}
- Custom Instructions: ${input.customInstructions || "None"}

QUESTION TYPES TO USE:
${questionTypeInstructions(input.questionTypes)}

OUTPUT REQUIREMENTS:
Return ONLY valid JSON matching this exact schema. No markdown, no code fences, no commentary.

{
  "title": "string",
  "description": "string (2-3 sentences describing the exam)",
  "instructions": "string (instructions for candidates)",
  "questions": [
    {
      "questionText": "string",
      "questionType": "MULTIPLE_CHOICE|MULTIPLE_SELECT|TRUE_FALSE|SHORT_ANSWER|OPEN_ENDED|FILL_IN_BLANK",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correctAnswer": "A. option" or ["A. option", "C. option"] for multiple select or "True"/"False" or answer text,
      "explanation": "string (why this is correct)",
      "difficulty": "EASY|MEDIUM|HARD",
      "topicTag": "string (sub-topic this question covers)",
      "points": 1
    }
  ],
  "metadata": {
    "topics": ["array of topics covered"],
    "difficulty": "${input.difficulty}",
    "estimatedDuration": ${input.timeLimitMinutes || input.questionCount * 2}
  }
}

QUALITY REQUIREMENTS:
- All questions must be clear, unambiguous, and grammatically correct
- Multiple choice options must be plausible but only one correct
- Explanations must be informative and educational
- Distribute difficulty: roughly 30% easy, 50% medium, 20% hard (unless specified otherwise)
- Cover different subtopics/aspects of the main topic
- Avoid trick questions
- Ensure the total count is exactly ${input.questionCount} questions`;
}

export function buildDocumentPrompt(input: DocumentGenerationInput): string {
  const maxChars = 12000;
  const truncatedText = input.extractedText.slice(0, maxChars);
  const wasTruncated = input.extractedText.length > maxChars;

  return `You are an expert exam creator. Generate an exam STRICTLY grounded in the provided document content.

SOURCE DOCUMENT: "${input.fileName}"
${wasTruncated ? `(Note: Document was truncated to first ${maxChars} characters for processing)\n` : ""}
--- DOCUMENT CONTENT START ---
${truncatedText}
--- DOCUMENT CONTENT END ---

GENERATION SETTINGS:
- Number of Questions: ${input.questionCount}
- Difficulty: ${input.difficulty}
- Include Explanations: ${input.includeExplanations}
- Strict Grounding: ${input.strictGrounding} (only use document as source, no external knowledge)
- Custom Instructions: ${input.customInstructions || "None"}

QUESTION TYPES TO USE:
${questionTypeInstructions(input.questionTypes)}

STRICT REQUIREMENTS:
${input.strictGrounding ? "- ONLY generate questions from information explicitly present in the document\n- Each question MUST reference a specific part of the document\n- Do not add knowledge not present in the document" : "- Use the document as primary source but may supplement with related knowledge"}
- Every question's answer must be derivable from the document
- Include sourceReference field showing which part of document the question comes from

OUTPUT REQUIREMENTS:
Return ONLY valid JSON matching this exact schema. No markdown, no code fences, no commentary.

{
  "title": "string (exam title derived from document topic)",
  "description": "string (what this exam covers)",
  "instructions": "string (for candidates)",
  "questions": [
    {
      "questionText": "string",
      "questionType": "MULTIPLE_CHOICE|MULTIPLE_SELECT|TRUE_FALSE|SHORT_ANSWER|OPEN_ENDED|FILL_IN_BLANK",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correctAnswer": "A. option" or answer text,
      "explanation": "string",
      "difficulty": "EASY|MEDIUM|HARD",
      "topicTag": "string",
      "sourceReference": "string (quote or description of the document section)",
      "points": 1
    }
  ],
  "metadata": {
    "topics": ["topics covered"],
    "difficulty": "${input.difficulty}",
    "estimatedDuration": ${input.questionCount * 2}
  }
}

Generate exactly ${input.questionCount} questions. Every question must be answerable from the document content.`;
}

export function buildRegenerateQuestionPrompt(
  questionText: string,
  instruction: string,
  context?: string
): string {
  return `You are an expert exam question editor. Modify the following exam question according to the instruction.

ORIGINAL QUESTION:
${JSON.stringify(questionText, null, 2)}

MODIFICATION INSTRUCTION: ${instruction}
${context ? `\nCONTEXT: ${context}` : ""}

Return ONLY valid JSON of the modified question matching this schema:
{
  "questionText": "string",
  "questionType": "MULTIPLE_CHOICE|MULTIPLE_SELECT|TRUE_FALSE|SHORT_ANSWER|OPEN_ENDED|FILL_IN_BLANK",
  "options": ["A. option text", "B. option text"],
  "correctAnswer": "A. option text (full option text, not just the letter)",
  "explanation": "string",
  "difficulty": "EASY|MEDIUM|HARD",
  "topicTag": "string",
  "sourceReference": "string or null",
  "points": 1
}`;
}

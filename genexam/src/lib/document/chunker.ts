export interface TextChunk {
  id: number;
  text: string;
  startChar: number;
  endChar: number;
}

export function chunkText(
  text: string,
  chunkSize = 1500,
  overlap = 200
): TextChunk[] {
  const cleaned = cleanText(text);
  const chunks: TextChunk[] = [];

  let start = 0;
  let id = 0;

  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);

    // Try to break at sentence boundary
    if (end < cleaned.length) {
      const breakAt = findSentenceBreak(cleaned, end, 200);
      if (breakAt > start) end = breakAt;
    }

    chunks.push({ id: id++, text: cleaned.slice(start, end).trim(), startChar: start, endChar: end });

    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks.filter((c) => c.text.length > 50);
}

function findSentenceBreak(text: string, around: number, window: number): number {
  const start = Math.max(0, around - window);
  const segment = text.slice(start, around);
  const match = segment.match(/[.!?]\s+/g);

  if (!match) return around;

  const lastMatch = segment.lastIndexOf(match[match.length - 1]);
  return start + lastMatch + match[match.length - 1].length;
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

export function chunksToContext(chunks: TextChunk[]): string {
  return chunks.map((c) => c.text).join("\n\n---\n\n");
}

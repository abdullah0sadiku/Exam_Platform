export interface ParsedDocument {
  text: string;
  pageCount?: number;
  metadata: Record<string, unknown>;
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedDocument> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (mimeType === "application/pdf" || ext === "pdf") {
    return parsePdf(buffer);
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    return parseDocx(buffer);
  }

  if (mimeType === "text/plain" || ext === "txt" || ext === "md") {
    return parsePlainText(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType || ext}`);
}

async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  // pdfjs-dist (used internally by pdf-parse) references DOMMatrix at module
  // load time. It's a browser-only Web API absent in Node.js — stub it out.
  // The stub is never actually called during plain text extraction.
  if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
    (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {};
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return {
    text: data.text,
    pageCount: data.numpages,
    metadata: { info: data.info },
  };
}

async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    metadata: { messages: result.messages },
  };
}

function parsePlainText(buffer: Buffer): ParsedDocument {
  return {
    text: buffer.toString("utf-8"),
    metadata: {},
  };
}

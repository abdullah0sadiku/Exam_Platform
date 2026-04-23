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
  if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
    (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {};
  }

  // Use CJS require so Node.js loads the self-contained CJS bundle
  // (pdf-parse/dist/pdf-parse/cjs/index.cjs). That bundle has pdfjs-dist bundled
  // inline — zero references to the external pdfjs-dist package — so the
  // Next.js standalone Docker image never needs pdfjs-dist in node_modules.
  //
  // Do NOT use `await import("pdf-parse")`: that resolves to the ESM entry which
  // imports pdfjs-dist as an *external* module. pdfjs-dist is not in the standalone
  // output, so pdf.worker.mjs would be missing at runtime.
  //
  // Do NOT call PDFParse.setWorker() / require.resolve() here: inside the
  // Next.js/webpack server bundle, require.resolve returns a numeric module ID,
  // not a file path, which breaks path.dirname. The CJS bundle already defaults
  // workerSrc to "./pdf.worker.mjs" and pdfjs resolves it via dynamic import()
  // relative to index.cjs's own directory — exactly where the Dockerfile copies
  // the worker file — so no override is needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  const { PDFParse } = require("pdf-parse") as any;

  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();
  await parser.destroy();
  return {
    text: textResult.text,
    pageCount: infoResult.total,
    metadata: { info: infoResult.info },
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

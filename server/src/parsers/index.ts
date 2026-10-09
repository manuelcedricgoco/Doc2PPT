import { MAX_WORDS, MIN_WORDS } from "../config.js";
import type { FileKind } from "../services/validateUpload.js";
import type { ParseHooks, ParsedDocument } from "../types/document.js";
import { AppError } from "../utils/AppError.js";
import { parseDocx } from "./docxParser.js";
import { parsePdf } from "./pdfParser.js";

export async function parseDocument(
  file: { buffer: Buffer; originalname: string; size: number },
  kind: FileKind,
  hooks: ParseHooks,
): Promise<ParsedDocument> {
  const doc =
    kind === "pdf"
      ? await parsePdf(file.buffer, file.originalname, file.size, hooks)
      : await parseDocx(file.buffer, file.originalname, file.size, hooks);

  const words = doc.metadata.wordCount;
  if (words === 0) {
    throw new AppError(
      "EMPTY_DOCUMENT",
      kind === "pdf"
        ? "We couldn't find any text in this PDF. If it is a scan made of images, Doc2PPT can't read it yet. Please try another PDF or DOCX file."
        : "This document doesn't contain any text. Please try another PDF or DOCX file.",
    );
  }
  if (words < MIN_WORDS) {
    throw new AppError(
      "INSUFFICIENT_TEXT",
      "We couldn't extract enough readable content from this document. Please try another PDF or DOCX file.",
    );
  }
  if (words > MAX_WORDS) {
    throw new AppError(
      "DOCUMENT_TOO_LARGE",
      `This document has about ${words.toLocaleString("en-US")} words. Doc2PPT can handle up to ${MAX_WORDS.toLocaleString("en-US")}. Try a shorter document or split it into parts.`,
    );
  }
  return doc;
}

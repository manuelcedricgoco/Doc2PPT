import { DOCX_MIME, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, PDF_MIME } from "../config.js";
import { AppError } from "../utils/AppError.js";

export type FileKind = "pdf" | "docx";

const OCTET = new Set(["", "application/octet-stream", "application/x-zip-compressed", "application/zip"]);

/**
 * Checks extension, MIME type (where the browser gives a useful one), size and
 * file signature. The signature check is the one that cannot be faked by renaming.
 */
export function validateUpload(file: { originalname: string; mimetype: string; size: number; buffer: Buffer }): FileKind {
  const name = file.originalname.toLowerCase();
  const kind: FileKind | null = name.endsWith(".pdf") ? "pdf" : name.endsWith(".docx") ? "docx" : null;

  if (!kind) {
    throw new AppError("UNSUPPORTED_TYPE", "Doc2PPT supports PDF and DOCX files only. Choose a .pdf or .docx file.", 415);
  }
  if (file.size === 0) {
    throw new AppError("EMPTY_FILE", "That file is empty. Choose a PDF or DOCX that has content.");
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError("FILE_TOO_LARGE", `That file is larger than ${MAX_FILE_SIZE_MB} MB. Choose a smaller PDF or DOCX.`, 413);
  }

  const expectedMime = kind === "pdf" ? PDF_MIME : DOCX_MIME;
  const mime = file.mimetype.toLowerCase();
  if (mime !== expectedMime && !OCTET.has(mime)) {
    throw new AppError("UNSUPPORTED_TYPE", "That file's type doesn't match a PDF or DOCX document.", 415);
  }

  const head = file.buffer.subarray(0, 8);
  const looksPdf = head.subarray(0, 5).toString("latin1") === "%PDF-";
  const looksZip = head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
  if (kind === "pdf" && !looksPdf) {
    throw new AppError("CORRUPT_PDF", "This PDF can't be opened. It may be damaged or not a real PDF. Please try another file.");
  }
  if (kind === "docx" && !looksZip) {
    throw new AppError("CORRUPT_DOCX", "This DOCX can't be opened. It may be damaged, or an older .doc file renamed to .docx. Please try another file.");
  }
  return kind;
}

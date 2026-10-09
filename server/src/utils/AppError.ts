export type ErrorCode =
  | "NO_FILE"
  | "UNSUPPORTED_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "INVALID_FILE"
  | "CORRUPT_PDF"
  | "CORRUPT_DOCX"
  | "PASSWORD_PROTECTED"
  | "EMPTY_DOCUMENT"
  | "INSUFFICIENT_TEXT"
  | "DOCUMENT_TOO_LARGE"
  | "EXTRACTION_FAILED";

/** An error whose message is safe and friendly to show to the user. */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}

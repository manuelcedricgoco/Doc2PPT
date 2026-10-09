export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Documents beyond these limits are rejected so one request cannot tie up the server.
export const MAX_PDF_PAGES = 300;
export const MAX_WORDS = 150_000;
// Fewer words than this means there is not enough text to build slides from.
export const MIN_WORDS = 20;

export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

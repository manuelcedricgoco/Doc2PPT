import type { DocumentAnalysis } from "../types/analysis";
import type { ParsedDocument } from "../types/document";

export async function fetchHealth(signal?: AbortSignal): Promise<{ status: string }> {
  const res = await fetch("/api/health", { signal });
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type ExtractEvent =
  | { type: "stage"; stage: "extracting"; page?: number; totalPages?: number }
  | { type: "stage"; stage: "reading" }
  | { type: "stage"; stage: "analyzing" }
  | { type: "done"; document: ParsedDocument; analysis: DocumentAnalysis }
  | { type: "error"; code: string; message: string };

export interface ExtractResult {
  document: ParsedDocument;
  analysis: DocumentAnalysis;
}

const GENERIC_ERROR = "Something went wrong while reading this document. Please try another PDF or DOCX file.";

/**
 * Uploads a file and reads the server's progress stream (one JSON object per line).
 * XMLHttpRequest is used because fetch cannot report upload progress.
 */
export function extractDocument(
  file: File,
  handlers: { onUploadProgress: (percent: number) => void; onEvent: (event: ExtractEvent) => void },
  signal: AbortSignal,
): Promise<ExtractResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/extract");

    let consumed = 0;
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const onAbort = () => {
      xhr.abort();
      settle(() => reject(new DOMException("Aborted", "AbortError")));
    };
    signal.addEventListener("abort", onAbort);

    // Handle every complete line received so far.
    const drain = () => {
      const text = xhr.responseText;
      let end: number;
      while ((end = text.indexOf("\n", consumed)) !== -1) {
        const line = text.slice(consumed, end).trim();
        consumed = end + 1;
        if (!line) continue;
        let event: ExtractEvent;
        try {
          event = JSON.parse(line) as ExtractEvent;
        } catch {
          continue;
        }
        if (event.type === "done") settle(() => resolve({ document: event.document, analysis: event.analysis }));
        else if (event.type === "error") settle(() => reject(new ApiError(event.code, event.message)));
        else handlers.onEvent(event);
      }
    };

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) handlers.onUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.upload.onload = () => handlers.onEvent({ type: "stage", stage: "extracting" });
    xhr.onprogress = () => {
      if (xhr.status === 200) drain();
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        drain();
        settle(() => reject(new ApiError("EXTRACTION_FAILED", GENERIC_ERROR)));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as { error?: { code: string; message: string } };
        settle(() => reject(new ApiError(body.error?.code ?? "EXTRACTION_FAILED", body.error?.message ?? GENERIC_ERROR)));
      } catch {
        settle(() => reject(new ApiError("EXTRACTION_FAILED", GENERIC_ERROR)));
      }
    };
    const networkError = () =>
      settle(() =>
        reject(new ApiError("NETWORK", "Doc2PPT couldn't reach its server. Check that it is running, then try again.")),
      );
    xhr.onerror = networkError;
    xhr.ontimeout = networkError;

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

import { useEffect, useState } from "react";
import { ApiError, extractDocument } from "../services/api";
import type { DocumentAnalysis } from "../types/analysis";
import type { ParsedDocument } from "../types/document";

export type ProcessingState =
  | { status: "idle" }
  | { status: "uploading"; percent: number }
  | { status: "extracting"; page?: number; totalPages?: number }
  | { status: "reading" }
  | { status: "analyzing" }
  | { status: "ready"; document: ParsedDocument; analysis: DocumentAnalysis }
  | { status: "error"; message: string };

/** Uploads the selected file and tracks each processing stage. Changing or removing the file cancels the request. */
export function useDocumentProcessing(file: File | null): ProcessingState {
  const [state, setState] = useState<ProcessingState>({ status: "idle" });

  useEffect(() => {
    if (!file) {
      setState({ status: "idle" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "uploading", percent: 0 });

    extractDocument(
      file,
      {
        onUploadProgress: (percent) => setState((s) => (s.status === "uploading" ? { status: "uploading", percent } : s)),
        onEvent: (event) => {
          if (event.type !== "stage") return;
          if (event.stage === "extracting") setState({ status: "extracting", page: event.page, totalPages: event.totalPages });
          else if (event.stage === "reading") setState({ status: "reading" });
          else setState({ status: "analyzing" });
        },
      },
      controller.signal,
    )
      .then(({ document, analysis }) => setState({ status: "ready", document, analysis }))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setState({
          status: "error",
          message: err instanceof ApiError ? err.message : "Something went wrong while reading this document. Please try another PDF or DOCX file.",
        });
      });

    return () => controller.abort();
  }, [file]);

  return state;
}

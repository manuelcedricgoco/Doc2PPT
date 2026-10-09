import { CheckCircle2 } from "lucide-react";
import type { ProcessingState } from "../hooks/useDocumentProcessing";

function describe(state: ProcessingState): { label: string; progress: number | null } {
  switch (state.status) {
    case "uploading":
      return { label: `Uploading... ${state.percent}%`, progress: state.percent };
    case "extracting":
      return state.page && state.totalPages
        ? { label: `Extracting text... page ${state.page} of ${state.totalPages}`, progress: (state.page / state.totalPages) * 100 }
        : { label: "Extracting text...", progress: null };
    case "reading":
      return { label: "Reading document...", progress: null };
    case "analyzing":
      return { label: "Analyzing document...", progress: null };
    default:
      return { label: "Ready!", progress: 100 };
  }
}

type Props = { state: ProcessingState; onReset: () => void };

export function ProcessingStatus({ state, onReset }: Props) {
  if (state.status === "idle") return null;

  if (state.status === "error") {
    return (
      <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p>{state.message}</p>
        <button type="button" onClick={onReset} className="mt-2 font-semibold underline underline-offset-2">
          Choose another file
        </button>
      </div>
    );
  }

  const { label, progress } = describe(state);
  const ready = state.status === "ready";

  return (
    <div className="mt-4">
      <p role="status" className="flex items-center gap-2 text-sm font-semibold">
        {ready && <CheckCircle2 size={18} className="text-ok" aria-hidden="true" />}
        {label}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${ready ? "bg-ok" : "bg-brand"} ${progress === null ? "animate-pulse motion-reduce:animate-none" : ""}`}
          style={{ width: `${progress ?? 100}%` }}
        />
      </div>
    </div>
  );
}

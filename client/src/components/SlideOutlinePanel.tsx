import type { ParsedDocument } from "../types/document";
import type { SlideOutline } from "../types/outline";
import { CATEGORY_LABELS } from "../utils/categories";
import { LENGTH_RANGES } from "../generators/slideOutline";
import { PendingBadge } from "./PendingBadge";

function sourceLabel(doc: ParsedDocument, ids: number[]): string {
  const names = ids.map((id) => doc.sections[id]?.heading ?? "Opening text");
  const unique = [...new Set(names)];
  return unique.length > 3 ? `${unique.slice(0, 3).join(", ")} and ${unique.length - 3} more` : unique.join(", ");
}

export function SlideOutlinePanel({ outline, document: doc }: { outline: SlideOutline; document: ParsedDocument }) {
  const { slides } = outline;
  return (
    <section aria-label="Planned slides" className="mt-5 rounded-[14px] border border-line bg-paper p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-display text-xl font-bold">Planned slides</h3>
        <PendingBadge phase={5} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {slides.length} slides using the {CATEGORY_LABELS[outline.category]} structure, {LENGTH_RANGES[outline.length].label} length.
      </p>

      <ol className="mt-4 divide-y divide-line border-y border-line">
        {slides.map((s) => (
          <li key={s.id} className="flex gap-4 py-3">
            <span className="w-6 shrink-0 text-right font-display text-lg font-bold leading-6 text-brand tabular-nums">{s.number}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-6">{s.title}</p>
              <p className="text-sm text-muted">
                {s.kind === "title"
                  ? "Title slide"
                  : `From ${sourceLabel(doc, s.sourceSectionIds)}, ${s.sourceWords} words of source text`}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {outline.notes.map((n) => (
        <p key={n} className="mt-3 text-sm leading-relaxed text-muted">{n}</p>
      ))}
      {outline.skipped.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Not included: {outline.skipped.map((k) => k.heading ?? "untitled section").join(", ")}.
        </p>
      )}
      <p className="mt-4 text-xs text-muted">
        PPTX generation uses this plan and extracts concise slide text from the mapped source paragraphs. Speaker notes are written from the same source sentences for each slide.
      </p>
    </section>
  );
}

import type { DocumentAnalysis } from "../types/analysis";
import type { ParsedDocument } from "../types/document";
import type { PresentationType } from "../types";
import { CATEGORY_LABELS, CATEGORY_TO_TYPE, ROLE_LABELS } from "../utils/categories";

const OUTLINE_LIMIT = 60;
const PREVIEW_PARAGRAPHS = 10;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

type Props = { document: ParsedDocument; analysis: DocumentAnalysis; selectedType: PresentationType };

export function DocumentSummary({ document: doc, analysis, selectedType }: Props) {
  const { metadata } = doc;
  const stats: [string, string][] = [
    ...(metadata.pageCount ? ([["Pages", String(metadata.pageCount)]] as [string, string][]) : []),
    ["Words", metadata.wordCount.toLocaleString("en-US")],
    ["Sections", String(doc.sections.filter((s) => s.heading).length)],
    ["Tables", String(doc.tables.length)],
  ];
  const firstTable = doc.tables[0];
  const roleOf = (id: number) => {
    const role = analysis.sections[id]?.role;
    return role && role !== "other" && role !== "opening" ? ROLE_LABELS[role] : null;
  };

  return (
    <section aria-label="Extracted document" className="mt-5 rounded-[14px] border border-line bg-paper p-5">
      <h3 className="font-display text-xl font-bold">{doc.title}</h3>
      <TopicCard analysis={analysis} selectedType={selectedType} />

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <details className="mt-5 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Document outline</summary>
        <ul className="mt-3 space-y-1.5 text-sm">
          {doc.sections.slice(0, OUTLINE_LIMIT).map((s) => (
            <li key={s.id} style={{ paddingLeft: `${(s.level - 1) * 1.25}rem` }} className="flex flex-wrap gap-x-2">
              <span className={s.heading ? "font-medium" : "italic text-muted"}>{s.heading ?? "Opening text"}</span>
              {roleOf(s.id) && (
                <span className="rounded border border-line bg-surface px-1.5 text-xs leading-5 text-muted">{roleOf(s.id)}</span>
              )}
              <span className="text-muted">
                {plural(s.paragraphIds.length, "paragraph")}
                {s.tableIds.length > 0 && `, ${plural(s.tableIds.length, "table")}`}
              </span>
            </li>
          ))}
        </ul>
        {doc.sections.length > OUTLINE_LIMIT && (
          <p className="mt-2 text-sm text-muted">and {doc.sections.length - OUTLINE_LIMIT} more sections</p>
        )}
      </details>

      <details className="mt-4 border-t border-line pt-4">
        <summary className="cursor-pointer text-sm font-semibold">Extracted text preview</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {doc.paragraphs.slice(0, PREVIEW_PARAGRAPHS).map((p) => (
            <li key={p.id} className={p.type === "list-item" ? "ml-4 list-disc" : ""}>
              {p.text.length > 240 ? p.text.slice(0, 240) + "..." : p.text}
            </li>
          ))}
        </ul>
        {firstTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-left text-sm">
              <tbody>
                {firstTable.rows.slice(0, 6).map((row, r) => (
                  <tr key={r} className="border-t border-line">
                    {row.map((cell, c) => {
                      const Cell = r === 0 && firstTable.hasHeader ? "th" : "td";
                      return (
                        <Cell key={c} className="px-3 py-1.5 font-normal first:pl-0 [&:is(th)]:font-semibold">
                          {cell}
                        </Cell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </section>
  );
}

function TopicCard({ analysis, selectedType }: { analysis: DocumentAnalysis; selectedType: PresentationType }) {
  const detected = CATEGORY_LABELS[analysis.category];
  const percent = Math.round(analysis.confidence * 100);
  const override = selectedType !== "Auto Detect" && selectedType !== CATEGORY_TO_TYPE[analysis.category];

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">Detected topic</p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 font-display text-xl font-bold">
        {detected}
        <span className="font-sans text-sm font-medium text-muted">
          {analysis.usedFallback ? "no clear match" : `${percent}% confidence`}
        </span>
      </p>

      {analysis.usedFallback ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This document doesn't clearly match one topic, so Doc2PPT will use the General structure.
          {analysis.bestGuess && ` The closest match was ${CATEGORY_LABELS[analysis.bestGuess]}.`}
        </p>
      ) : (
        analysis.matchedKeywords.length > 0 && (
          <p className="mt-2 text-sm leading-relaxed text-muted">Found in your document: {analysis.matchedKeywords.join(", ")}.</p>
        )
      )}

      {override && (
        <p className="mt-2 text-sm font-medium">
          You chose {selectedType}, so Doc2PPT will use that instead of {detected}.
        </p>
      )}

      {analysis.keywords.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted">Key terms</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {analysis.keywords.map((k) => (
              <li key={k} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-sm text-brand-dark">
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Rule-based topic detection. It runs on the Doc2PPT server, without AI.</p>
    </div>
  );
}

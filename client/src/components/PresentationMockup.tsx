import type { CSSProperties } from "react";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

// Sample content only: shows how a document passage becomes a slide plus script.
export function PresentationMockup() {
  return (
    <figure>
      <div aria-hidden="true" className="grid items-center gap-4 sm:grid-cols-[0.75fr_auto_1.25fr]">
        {/* Source document */}
        <div className="rounded-[4px] border border-line bg-surface p-5 shadow-[0_14px_32px_-20px_rgba(21,27,46,0.35)]">
          <p className="text-[10px] font-semibold text-muted">Chapter 1: Introduction</p>
          <h3 className="mt-3 font-display text-sm font-bold">1.3 Objectives of the Study</h3>
          <p className="mt-3 text-[11px] leading-[1.75] text-ink/80">
            This study aims to{" "}
            <mark className="mark" style={d(0.5)}>identify the factors that affect student attendance</mark>. It also
            seeks to{" "}
            <mark className="mark" style={d(1.1)}>examine how attendance relates to academic performance</mark>, using
            records gathered from the school. Finally, it will{" "}
            <mark className="mark" style={d(1.7)}>present recommendations for school administrators</mark>.
          </p>
          <div className="mt-4 space-y-1.5">
            <span className="block h-1.5 w-full rounded-full bg-line/70" />
            <span className="block h-1.5 w-11/12 rounded-full bg-line/70" />
            <span className="block h-1.5 w-7/12 rounded-full bg-line/70" />
          </div>
        </div>

        <svg className="hidden sm:block" width="28" height="16" viewBox="0 0 28 16" fill="none">
          <path d="M1 8h24m0 0-6-6m6 6-6 6" stroke="#566074" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Generated slide + script */}
        <div className="space-y-3">
          <div className="relative flex aspect-[16/10] overflow-hidden rounded-md border border-line bg-surface shadow-[0_14px_32px_-20px_rgba(21,27,46,0.35)]">
            <span className="w-2 shrink-0 bg-brand" />
            <div className="flex-1 p-4 sm:p-5">
              <h3 className="font-display text-lg font-bold sm:text-xl">Objectives</h3>
              <ul className="mt-3 space-y-2 text-[12px] leading-snug sm:text-[13px]">
                {[
                  "Identify factors affecting attendance",
                  "Examine attendance and academic performance",
                  "Present recommendations for administrators",
                ].map((text, i) => (
                  <li key={text} className="reveal flex gap-2" style={d(1.0 + i * 0.6)}>
                    <span className="mt-[5px] h-1.5 w-1.5 shrink-0 bg-brand" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
            <span className="absolute bottom-2 right-3 text-[10px] text-muted">4 / 9</span>
          </div>

          <div className="reveal rounded-lg bg-ink p-4 text-white" style={d(2.9)}>
            <p className="text-[11px] font-semibold text-white/65">Presenter script</p>
            <p className="mt-1 text-xs leading-relaxed text-white/90">
              Our main objectives are to identify the factors that affect attendance, examine how attendance relates to
              academic performance, and present recommendations.
            </p>
          </div>

          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`aspect-video flex-1 rounded-[3px] border ${i === 3 ? "border-brand bg-brand-soft" : "border-line bg-surface"}`}
              />
            ))}
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-sm text-muted">
        Sample preview: highlighted sentences from a document become slide bullets, with a script for the presenter.
      </figcaption>
    </figure>
  );
}

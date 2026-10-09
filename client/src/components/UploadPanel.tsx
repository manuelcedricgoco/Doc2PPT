import { useEffect, useMemo, useState } from "react";
import { Download, FileText, X } from "lucide-react";
import { UploadDropzone } from "./UploadDropzone";
import { GenerationCounter } from "./GenerationCounter";
import { PendingBadge } from "./PendingBadge";
import { ProcessingStatus } from "./ProcessingStatus";
import { DocumentSummary } from "./DocumentSummary";
import { SlideOutlinePanel } from "./SlideOutlinePanel";
import { buildGeneratedPresentation, type GeneratedPresentation } from "../generators/generatedPresentation";
import { buildSlideOutline } from "../generators/slideOutline";
import { useFileSelection } from "../hooks/useFileSelection";
import { useDocumentProcessing } from "../hooks/useDocumentProcessing";
import { formatFileSize } from "../utils/format";
import { canGeneratePresentation, consumeGeneration, getGenerationState } from "../utils/generationLimit";
import {
  PRESENTATION_LENGTHS,
  PRESENTATION_TYPES,
  VISUAL_STYLES,
  type PresentationLength,
  type PresentationType,
  type VisualStyle,
} from "../types";

const selectClass =
  "mt-2 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink";

export function UploadPanel() {
  const { file, error, select, clear } = useFileSelection();
  const processing = useDocumentProcessing(file);
  const [type, setType] = useState<PresentationType>("Auto Detect");
  const [style, setStyle] = useState<VisualStyle>("Modern");
  const [length, setLength] = useState<PresentationLength>("standard");
  const [downloadState, setDownloadState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [presentationPreview, setPresentationPreview] = useState<GeneratedPresentation | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [remainingGenerations, setRemainingGenerations] = useState(() => getGenerationState().remaining);

  // Re-plans instantly when the type or length changes. Runs in the browser, so nothing is re-uploaded.
  const outline = useMemo(
    () => (processing.status === "ready" ? buildSlideOutline(processing.document, processing.analysis, { type, length }) : null),
    [processing, type, length],
  );

  useEffect(() => {
    const sync = () => setRemainingGenerations(getGenerationState().remaining);
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    if (processing.status !== "ready" || !outline) {
      setPresentationPreview(null);
      setActiveSlideIndex(0);
      return;
    }

    const next = buildGeneratedPresentation(processing.document, outline, style);
    setPresentationPreview(next);
    setActiveSlideIndex(0);
  }, [processing.status, outline, style]);

  const updatePreviewSlide = (updater: (slide: GeneratedPresentation["slides"][number]) => GeneratedPresentation["slides"][number]) => {
    setPresentationPreview((current) => {
      if (!current) return current;
      return {
        ...current,
        slides: current.slides.map((slide, index) => index === activeSlideIndex ? updater(slide) : slide),
      };
    });
  };

  const handleDownload = async () => {
    if (processing.status !== "ready" || !outline || !canGeneratePresentation()) return;
    setDownloadState("generating");
    setDownloadMessage("Building your PowerPoint file...");
    try {
      const presentation = presentationPreview ?? buildGeneratedPresentation(processing.document, outline, style);
      const { downloadPresentation } = await import("../generators/pptx");
      const fileName = await downloadPresentation(presentation);
      const generation = consumeGeneration();
      setRemainingGenerations(generation.remaining);
      setPresentationPreview(presentation);
      setDownloadState("done");
      setDownloadMessage(`${fileName} was generated.`);
    } catch {
      setDownloadState("error");
      setDownloadMessage("Doc2PPT could not generate the PPTX file. Please try again.");
    }
  };

  return (
    <section id="create" aria-labelledby="create-heading" className="mx-auto max-w-6xl px-5 py-16">
      <h2 id="create-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Create a presentation
      </h2>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="rounded-xl border border-line bg-surface p-5 sm:p-7">
          {file ? (
            <div className="flex items-center gap-4 rounded-[14px] border border-line bg-paper p-4">
              <FileText size={28} className="shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{file.name}</p>
                <p className="text-sm text-muted">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={clear}
                aria-label={`Remove ${file.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <UploadDropzone onSelect={select} />
          )}

          {file && <ProcessingStatus state={processing} onReset={clear} />}
          <p role={error ? "alert" : undefined} className={`mt-3 text-sm ${error ? "text-red-700" : "hidden"}`}>
            {error}
          </p>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="presentation-type" className="text-sm font-semibold">
                Presentation type
              </label>
              <select
                id="presentation-type"
                className={selectClass}
                value={type}
                onChange={(e) => setType(e.target.value as PresentationType)}
              >
                {PRESENTATION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="visual-style" className="text-sm font-semibold">
                Visual style
              </label>
              <select
                id="visual-style"
                className={selectClass}
                value={style}
                onChange={(e) => setStyle(e.target.value as VisualStyle)}
              >
                {VISUAL_STYLES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold">Length</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PRESENTATION_LENGTHS.map((l) => (
                <label key={l.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="length"
                    value={l.value}
                    checked={length === l.value}
                    onChange={() => setLength(l.value)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-lg border border-line bg-surface px-3 py-2.5 text-center peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand">
                    <span className="block text-sm font-semibold">{l.label}</span>
                    <span className="block text-xs opacity-75">{l.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {processing.status === "ready" && (
            <DocumentSummary document={processing.document} analysis={processing.analysis} selectedType={type} />
          )}
          {processing.status === "ready" && outline && <SlideOutlinePanel outline={outline} document={processing.document} />}
          {presentationPreview && (
            <section aria-label="Presentation preview and editing" className="mt-5 rounded-[14px] border border-line bg-paper p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 className="font-display text-xl font-bold">Preview and edit</h3>
                <PendingBadge phase={7} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  {presentationPreview.slides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(index)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        activeSlideIndex === index
                          ? "border-brand bg-brand-soft text-brand-dark"
                          : "border-line bg-surface text-ink hover:border-brand/60"
                      }`}
                    >
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Slide {slide.number}</span>
                      <span className="mt-1 block text-sm font-semibold">{slide.title}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Selected slide</p>
                      <p className="mt-1 font-display text-xl font-bold">{presentationPreview.slides[activeSlideIndex]?.title}</p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark">
                      {presentationPreview.slides[activeSlideIndex]?.number}/{presentationPreview.slides.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-4">
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold">Title</span>
                      <input
                        value={presentationPreview.slides[activeSlideIndex]?.title ?? ""}
                        onChange={(event) =>
                          updatePreviewSlide((slide) => ({
                            ...slide,
                            title: event.target.value || "Untitled slide",
                          }))
                        }
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold">Bullet points</span>
                      <textarea
                        rows={6}
                        value={(presentationPreview.slides[activeSlideIndex]?.bullets ?? []).join("\n")}
                        onChange={(event) =>
                          updatePreviewSlide((slide) => ({
                            ...slide,
                            bullets: event.target.value
                              .split(/\r?\n/)
                              .map((line) => line.trim())
                              .filter(Boolean)
                              .slice(0, 5),
                          }))
                        }
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold">Presenter script</span>
                      <textarea
                        rows={5}
                        value={presentationPreview.slides[activeSlideIndex]?.script ?? ""}
                        onChange={(event) =>
                          updatePreviewSlide((slide) => ({
                            ...slide,
                            script: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <button
              type="button"
              disabled={processing.status !== "ready" || !outline || downloadState === "generating" || !canGeneratePresentation()}
              aria-describedby="generate-note"
              onClick={handleDownload}
              className="btn btn-primary"
            >
              <Download size={18} aria-hidden="true" />
              {downloadState === "generating" ? "Generating..." : "Generate Presentation"}
            </button>
            <PendingBadge phase={5} />
          </div>
          <p
            id="generate-note"
            role={downloadState === "error" ? "alert" : downloadState === "done" ? "status" : undefined}
            className={`mt-3 text-sm ${downloadState === "error" ? "text-red-700" : downloadState === "done" ? "text-ok" : "text-muted"}`}
          >
            {downloadMessage ||
              (processing.status === "ready"
                ? !canGeneratePresentation()
                  ? "You have used all free presentations for this period. Please refresh the page after the reset time."
                  : "Generate a real .pptx using the current type, style, length, and source-based slide plan."
                : "Your file is sent to the Doc2PPT server and read in memory. It is not saved.")}
          </p>
        </div>

        <aside className="h-fit rounded-xl border border-line bg-surface p-6" aria-label="Free generations">
          <GenerationCounter variant="large" remaining={remainingGenerations} />
        </aside>
      </div>
    </section>
  );
}

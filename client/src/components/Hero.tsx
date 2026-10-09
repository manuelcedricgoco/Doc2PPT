import { PresentationMockup } from "./PresentationMockup";

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-12 lg:pt-20"
    >
      <div>
        <h1
          id="hero-heading"
          className="font-display text-[2.75rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.1rem]"
        >
          Turn documents into presentations.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted">
          Upload a PDF or DOCX and transform your content into a structured, modern PowerPoint presentation with a
          presenter-ready script.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#create" className="btn btn-primary">
            Upload Document
          </a>
          <a href="#how-it-works" className="btn btn-secondary">
            How It Works
          </a>
        </div>
        <p className="mt-6 text-sm text-muted">No account needed. Works with PDF and DOCX files up to 20 MB.</p>
      </div>
      <PresentationMockup />
    </section>
  );
}

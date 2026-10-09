import { PendingBadge } from "./PendingBadge";

const steps = [
  { title: "Upload your document", text: "Choose a PDF or DOCX file, up to 20 MB.", phase: 2 },
  { title: "Choose your options", text: "Pick a presentation type, visual style and length, or let Doc2PPT detect the type.", phase: 5 },
  { title: "Generate", text: "Doc2PPT reads your headings, sections and lists, detects the topic and organizes them into slides using rule-based logic.", phase: 5 },
  { title: "Preview and edit", text: "Check every slide and its presenter script. Change titles, bullets or script text before you download.", phase: 7 },
  { title: "Download", text: "Save the finished presentation as a .pptx file that opens in PowerPoint.", phase: 5 },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <h2 id="how-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            From file to finished slides in five steps. There is nothing to sign up for.
          </p>
        </div>
        <ol className="divide-y divide-line border-y border-line">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-5 py-6">
              <span className="font-display text-3xl font-bold leading-none text-brand tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <PendingBadge phase={s.phase} />
                </div>
                <p className="mt-1.5 max-w-xl leading-relaxed text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import { PendingBadge } from "./PendingBadge";

const features = [
  { title: "No login, no account", text: "Open the site and start. There is no registration, email or password.", phase: 1 },
  { title: "No paid AI", text: "Doc2PPT runs on its own rule-based logic. It needs no API key and calls no outside AI service.", phase: 1 },
  { title: "Faithful to your document", text: "Slides reorganize what your document says. Nothing is added that is not in the source: no invented statistics, names or citations.", phase: 5 },
  { title: "A script for every slide", text: "Presenter notes are written from your own content, so you can practice and present with confidence.", phase: 6 },
  { title: "Six visual styles", text: "Modern, Minimal, Professional, Academic, Dark and Corporate, with layouts that follow your topic.", phase: 5 },
  { title: "Topic detection", text: "Academic, IT, business, educational, marketing or general. Doc2PPT picks a slide structure that fits, and you can override it.", phase: 3 },
];

export function Features() {
  return (
    <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-6xl px-5 py-20">
      <h2 id="features-heading" className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Features
      </h2>
      <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
        {features.map((f) => (
          <li key={f.title} className="border-t border-line py-7">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <PendingBadge phase={f.phase} />
            </div>
            <p className="mt-2 max-w-md leading-relaxed text-muted">{f.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

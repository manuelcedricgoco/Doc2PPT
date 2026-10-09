import { Logo } from "./Logo";
import { useServerHealth } from "../hooks/useServerHealth";

const statusText = {
  checking: "Checking server",
  online: "Server online",
  offline: "Server offline",
} as const;

export function Footer() {
  const server = useServerHealth();
  const dot = server === "online" ? "bg-ok" : server === "offline" ? "bg-red-600" : "bg-muted";

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Doc2PPT does not use Claude API, OpenAI API, Gemini API, or another paid AI API.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <nav aria-label="Footer" className="flex gap-5 font-medium">
            <a href="#how-it-works" className="hover:underline">How It Works</a>
            <a href="#features" className="hover:underline">Features</a>
            <a href="#privacy" className="hover:underline">Privacy</a>
          </nav>
          <p className="flex items-center gap-2 text-muted" role="status">
            <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
            {statusText[server]}
          </p>
        </div>
      </div>
    </footer>
  );
}

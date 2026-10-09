import { useEffect, useState } from "react";
import { GENERATION_LIMIT, RESET_DURATION_HOURS } from "../utils/config";
import { getGenerationState, getResetCountdownText } from "../utils/generationLimit";

type Props = { variant?: "compact" | "large"; remaining?: number };

export function GenerationCounter({ variant = "compact", remaining: forcedRemaining }: Props) {
  const [remaining, setRemaining] = useState<number>(() => {
    const state = getGenerationState();
    return forcedRemaining ?? state.remaining;
  });
  const [countdown, setCountdown] = useState(() => getResetCountdownText());

  useEffect(() => {
    const sync = () => {
      const state = getGenerationState();
      setRemaining(forcedRemaining ?? state.remaining);
      setCountdown(getResetCountdownText());
    };

    sync();
    const timer = window.setInterval(sync, 60_000);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, [forcedRemaining]);

  const displayRemaining = forcedRemaining ?? remaining;
  const pips = Array.from({ length: GENERATION_LIMIT }, (_, i) => i < displayRemaining);
  const label = `Free generations: ${displayRemaining} of ${GENERATION_LIMIT}`;

  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-3.5 pr-3 text-sm"
        role="group"
        aria-label={label}
      >
        <span className="text-muted">
          <span className="sm:hidden">Free</span>
          <span className="hidden sm:inline">Free Generations</span>
        </span>
        <span className="font-semibold tabular-nums">
          {displayRemaining} / {GENERATION_LIMIT}
        </span>
      </div>
    );
  }

  return (
    <div role="group" aria-label={label}>
      <p className="text-sm font-medium text-muted">Free Generations</p>
      <p className="mt-1 font-display text-5xl font-bold tabular-nums">
        {displayRemaining} / {GENERATION_LIMIT}
      </p>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        {pips.map((filled, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${filled ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Each presentation uses one generation. The count resets after {RESET_DURATION_HOURS} hours.
      </p>
      <p className="mt-2 text-xs font-medium text-brand-dark">Reset in {countdown}</p>
    </div>
  );
}

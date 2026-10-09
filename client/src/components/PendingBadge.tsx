import { CURRENT_PHASE } from "../utils/config";

// Marks features that exist as interface only. Disappears once its phase ships.
export function PendingBadge({ phase }: { phase: number }) {
  if (CURRENT_PHASE >= phase) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-mark px-2.5 py-0.5 text-xs font-semibold text-ink">
      Coming in Phase {phase}
    </span>
  );
}

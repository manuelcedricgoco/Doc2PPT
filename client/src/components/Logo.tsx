export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#2748d8" />
        <rect x="7" y="8" width="12" height="16" rx="1.5" fill="#fff" />
        <rect x="13" y="12" width="12" height="12" rx="1.5" fill="#ffe066" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">Doc2PPT</span>
    </span>
  );
}

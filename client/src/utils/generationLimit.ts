import { GENERATION_LIMIT, RESET_DURATION_HOURS } from "./config";

export interface GenerationState {
  remaining: number;
  resetAt: number;
}

const STORAGE_KEY = "doc2ppt-generation-limit";
const RESET_MS = RESET_DURATION_HOURS * 60 * 60 * 1000;

function normalizeState(state: Partial<GenerationState> | null, now = Date.now()): GenerationState {
  const remaining = Number.isFinite(state?.remaining) ? Math.max(0, Math.min(GENERATION_LIMIT, Number(state?.remaining))) : GENERATION_LIMIT;
  const resetAt = Number.isFinite(state?.resetAt) ? Number(state?.resetAt) : now + RESET_MS;

  if (now >= resetAt) {
    return { remaining: GENERATION_LIMIT, resetAt: now + RESET_MS };
  }

  return { remaining, resetAt };
}

function writeState(state: GenerationState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; the app can still render a local in-memory fallback.
  }
}

export function getGenerationState(now = Date.now()): GenerationState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = { remaining: GENERATION_LIMIT, resetAt: now + RESET_MS };
      writeState(initial);
      return initial;
    }

    const parsed = JSON.parse(stored) as Partial<GenerationState> | null;
    const normalized = normalizeState(parsed, now);
    if (normalized.remaining !== parsed?.remaining || normalized.resetAt !== parsed?.resetAt) {
      writeState(normalized);
    }
    return normalized;
  } catch {
    return { remaining: GENERATION_LIMIT, resetAt: now + RESET_MS };
  }
}

export function getResetCountdownText(now = Date.now()): string {
  const { resetAt } = getGenerationState(now);
  const remainingMs = Math.max(0, resetAt - now);
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return "less than a minute left";
}

export function consumeGeneration(): GenerationState & { reachedLimit: boolean } {
  const now = Date.now();
  const state = getGenerationState(now); 
  if (state.remaining <= 0) {
    return { remaining: 0, resetAt: state.resetAt, reachedLimit: true };
  }

  const next = { remaining: Math.max(0, state.remaining - 1), resetAt: state.resetAt };
  writeState(next);
  return { ...next, reachedLimit: false };
}

export function canGeneratePresentation(): boolean {
  return getGenerationState().remaining > 0;
}

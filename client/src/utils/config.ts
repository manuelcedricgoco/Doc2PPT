// Prototype settings. The limit and cooldown logic itself arrives in Phase 8.
export const GENERATION_LIMIT = 5;
export const RESET_DURATION_HOURS = 24; // 5 or 24

export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;

// Which phase of the build is complete. Features that need a later phase
// show a "Coming in Phase N" badge until this number reaches that phase.
export const CURRENT_PHASE = 10;

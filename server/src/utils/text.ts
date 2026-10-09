const LIGATURES: Record<string, string> = { "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl" };

/** Cleans extraction artifacts only. Wording and numbers are never changed. */
export function normalizeText(input: string): string {
  return input
    .replace(/[ﬀ-ﬄ]/g, (c) => LIGATURES[c] ?? c)
    .replace(/\u00ad/g, "") // soft hyphen
    .replace(/[\u00a0\u2007\u202f]/g, " ") // non-breaking spaces
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu);
  return m ? m.length : 0;
}

/** Matches "Chapter 2", "Section 3", "Lesson 1", "1.2 Title", "II. Title", "A. Title". */
const NUMBERED_HEADING =
  /^(?:(?:chapter|section|part|lesson|unit|module|kabanata|aralin)\s+[\dIVXLC]+\b[.:)]?\s*.*|\d+(?:\.\d+){0,3}[.)]?\s+\p{Lu}.*|[IVX]{1,5}\.\s+\p{Lu}.*|[A-Z]\.\s+\p{Lu}[^.]*)$/iu;

/** Depth of a numbered heading: "1" -> 1, "1.2" -> 2, "1.2.3" -> 3. Null if not numbered. */
export function numberingDepth(text: string): number | null {
  const m = text.match(/^(\d+(?:\.\d+){0,3})[.)]?\s/);
  return m ? m[1].split(".").length : null;
}

/** Shape check only: short, no sentence punctuation at the end. */
export function looksLikeTitleLine(text: string): boolean {
  if (text.length < 2 || text.length > 100) return false;
  if (/[.,;:]$/.test(text) && !/^\d+(\.\d+)*\.$/.test(text)) return false;
  return countWords(text) <= 14;
}

export function looksLikeNumberedHeading(text: string): boolean {
  return looksLikeTitleLine(text) && NUMBERED_HEADING.test(text);
}

export function isAllCapsHeading(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  return letters.length >= 3 && letters === letters.toUpperCase() && looksLikeTitleLine(text);
}

/** Bullet or numbered list marker at the start of a line. */
const LIST_MARKER = /^(?:[•●○◦▪▫■□▸►‣⁃–—\uE000-\uF8FF-]|\*|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)])\s+/;
/** A cell that holds only a list marker (bullet or number). */
export const MARKER_ONLY = /^(?:[•●○◦▪▫■□▸►‣⁃–—\uE000-\uF8FF*-]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)])$/;
export function stripListMarker(text: string): string | null {
  const m = text.match(LIST_MARKER);
  return m ? text.slice(m[0].length).trim() : null;
}

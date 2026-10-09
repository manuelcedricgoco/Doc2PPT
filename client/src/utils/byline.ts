/**
 * Detects "byline" lines such as "Goco Manuel Cedric P. 08/28/26 BSIT 3A" or "Submitted by: Juan Dela Cruz".
 * These are common at the top of school papers. They describe the author, not the topic, so they should
 * never become the presentation title or the title of a content slide.
 */

const DATE =
  /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i;
const LABEL =
  /^(?:submitted\s+(?:by|to)|prepared\s+by|presented\s+by|reported\s+by|name|author|by|student|course|section|subject|professor|instructor|teacher|date)\s*[:\-]/i;
const COURSE_SECTION = /\b[A-Z]{2,6}[\s-]?\d{1,3}[A-Z]?\b/;

function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function looksLikeByline(text: string | null | undefined): boolean {
  if (!text) return false;
  const s = squash(text);
  if (!s || s.length > 100) return false;
  if (LABEL.test(s)) return true;
  return s.split(" ").length <= 14 && DATE.test(s);
}

export interface Byline {
  /** Usually the author's name. */
  name: string;
  /** Course/section and date, when present. */
  details: string[];
}

export function parseByline(text: string): Byline {
  let rest = squash(text);
  const details: string[] = [];

  const section = rest.match(COURSE_SECTION);
  if (section) {
    details.push(section[0]);
    rest = rest.replace(section[0], " ");
  }
  const date = rest.match(DATE);
  if (date) {
    details.push(date[0]);
    rest = rest.replace(date[0], " ");
  }

  const name = squash(rest).replace(/^[,;:\-–—\s]+|[,;:\-–—\s]+$/g, "");
  return { name: name || squash(text), details };
}

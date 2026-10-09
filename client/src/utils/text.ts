export function countWords(text: string): number {
  const m = text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu);
  return m ? m.length : 0;
}

/** Removes numbering such as "1.3", "II." or "Chapter 2:" from the start of a heading. */
export function cleanHeading(heading: string): string {
  const cleaned = heading.replace(/^\s*(?:chapter|section|part|lesson|unit)?\s*(?:\d+(?:\.\d+)*|[IVXLC]+)[.):\-]?\s+/i, "").trim();
  return cleaned || heading.trim();
}

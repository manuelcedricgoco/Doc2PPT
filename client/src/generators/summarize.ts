/**
 * Rule-based key-sentence selection. Runs locally, no AI.
 *
 * Slides should hold the few sentences that carry the point of a passage, written in the author's own words.
 * Everything else stays available in the speaker notes, so nothing from the document is lost.
 */

const STOP = new Set(
  (
    "about above after again against all also although always among and any are because been before being below between both but " +
    "can could did does doing down during each either else even ever every few for from further had has have having her here hers " +
    "him his how however into its itself just like many may might more most much must myself neither nor not now off once only other " +
    "our ours out over own same she should since some such than that the their theirs them then there these they this those though " +
    "through thus too under until upon very was were what when where whether which while who whom whose why will with within without " +
    "would you your yours " +
    // common Filipino function words
    "ang ng sa na at mga ay si ni kay para ito iyon ito nito niya nila namin natin kanilang kanyang ating aming dahil upang habang " +
    "ngunit subalit kung kapag pero rin din lang lamang pa po"
  ).split(" "),
);

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "no", "nos", "vs", "etc", "fr", "gen", "col", "capt",
  "sgt", "lt", "rev", "hon", "atty", "engr", "dept", "fig", "ave", "blvd", "inc", "co", "corp", "ltd", "approx",
  "e.g", "i.e", "u.s", "p.m", "a.m", "ca", "c", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept",
  "oct", "nov", "dec",
]);

export interface SourceParagraph {
  text: string;
  type: "paragraph" | "list-item";
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).map((t) => t.replace(/['’-]+$/g, ""));
}

/** Splits text into sentences without breaking on "Dr.", "Cedric P. Goco", "No. 5" and similar. */
export function splitSentences(text: string): string[] {
  const t = cleanText(text);
  if (!t) return [];
  const out: string[] = [];
  const boundary = /[.!?]+["”’')\]]*\s+(?=["“‘'(\[]?[\p{Lu}\p{N}])/gu;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = boundary.exec(t))) {
    const end = m.index + m[0].trimEnd().length;
    const chunk = t.slice(start, end);
    if (m[0][0] === ".") {
      const lastWord = chunk.replace(/[.!?"”’')\]]+$/u, "").split(" ").pop() ?? "";
      const isInitial = /^\p{Lu}$/u.test(lastWord);
      const isAbbreviation = ABBREVIATIONS.has(lastWord.toLowerCase());
      if (isInitial || isAbbreviation) continue;
    }
    out.push(chunk.trim());
    start = m.index + m[0].length;
  }
  const tail = t.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

/** Words that repeat across the document are its topics. Title words count extra. */
export function buildWeights(texts: string[], title: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const text of texts) {
    for (const w of tokens(text)) {
      if (w.length < 4 || STOP.has(w)) continue;
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  for (const w of tokens(title)) if (freq.has(w)) freq.set(w, (freq.get(w) ?? 0) + 3);
  const weights = new Map<string, number>();
  for (const [w, count] of freq) weights.set(w, count >= 2 ? Math.log(1 + count) : 0.25);
  return weights;
}

function scoreSentence(sentence: string, indexInParagraph: number, weights: Map<string, number>): number {
  const toks = tokens(sentence);
  const n = toks.length;
  if (n < 8) return -1; // fragments make poor bullets
  let score = 0;
  for (const w of new Set(toks)) if (w.length >= 4 && !STOP.has(w)) score += weights.get(w) ?? 0;
  score /= Math.sqrt(n);

  if (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(sentence)) score += 0.7; // a year usually means a concrete fact
  else if (/\d/.test(sentence)) score += 0.25;
  const capitalized = (sentence.slice(1).match(/\b\p{Lu}\p{Ll}+/gu) ?? []).length;
  if (capitalized >= 2) score += 0.3; // names and places
  if (indexInParagraph === 0) score *= 1.3; // topic sentence
  if (n > 40) score *= 0.75;
  return score;
}

/**
 * Shortens a long sentence at a natural clause break. Never cuts mid-word and avoids "..." where a clause
 * boundary exists.
 */
export function tighten(sentence: string, max: number): string {
  const s = cleanText(sentence);
  if (s.length <= max) return s;
  const window = s.slice(0, max);
  const breaks = [window.lastIndexOf("; "), window.lastIndexOf(", "), window.lastIndexOf(" — "), window.lastIndexOf(" - ")];
  const best = Math.max(...breaks);
  if (best >= Math.min(90, max * 0.55)) return `${window.slice(0, best).replace(/[,;:\s]+$/, "")}.`;
  const lastSpace = window.lastIndexOf(" ");
  return `${window.slice(0, lastSpace > 60 ? lastSpace : max).replace(/[,;:\s]+$/, "")}…`;
}

interface Candidate {
  text: string;
  score: number;
  order: number;
  /** Starts with "It", "They", "However"... so it only makes sense right after the sentence before it. */
  dangling: boolean;
}

const DANGLING_START = /^(?:it|its|they|them|their|however|therefore|thus|moreover|furthermore|additionally|consequently|also|then|as a result|in addition)\b/i;

export interface PickOptions {
  maxItems: number;
  maxChars: number;
}

/**
 * Picks the most informative sentences from a slide's source paragraphs, in their original order.
 * List items written by the author are kept as bullets and always come first.
 */
export function pickKeySentences(paragraphs: SourceParagraph[], weights: Map<string, number>, options: PickOptions): string[] {
  const candidates: Candidate[] = [];
  let order = 0;

  for (const paragraph of paragraphs) {
    if (paragraph.type === "list-item") {
      candidates.push({ text: cleanText(paragraph.text), score: 100 - order * 0.01, order: order++, dangling: false });
      continue;
    }
    splitSentences(paragraph.text).forEach((sentence, index) => {
      candidates.push({ text: sentence, score: scoreSentence(sentence, index, weights), order: order++, dangling: DANGLING_START.test(sentence) });
    });
  }
  if (!candidates.length) return [];

  const chosen: Candidate[] = [];
  const chosenOrders = new Set<number>();
  const seen = new Set<string>();
  let chars = 0;
  const take = (c: Candidate): boolean => {
    const key = c.text.toLowerCase();
    if (seen.has(key)) return false;
    if (chosen.length >= options.maxItems) return false;
    if (chosen.length > 0 && chars + c.text.length > options.maxChars) return false;
    seen.add(key);
    chosen.push(c);
    chosenOrders.add(c.order);
    chars += Math.min(c.text.length, 200);
    return true;
  };

  const byScore = [...candidates].sort((a, b) => b.score - a.score || a.order - b.order);
  // The opening sentence frames the slide, so it goes in first.
  const first = candidates[0];
  if (!first.dangling && (first.score >= 0 || candidates.length <= options.maxItems)) take(first);
  // Self-contained sentences first. A sentence like "It was formed in the home..." only joins when the sentence
  // before it is on the slide too, otherwise it would refer to something the audience never saw.
  for (const c of byScore) if (!c.dangling && c.score >= 0) take(c);
  for (const c of byScore) if (c.dangling && c.score >= 0 && chosenOrders.has(c.order - 1)) take(c);
  // Short fragments only fill in when there is almost nothing else to show.
  for (const c of byScore) if (chosen.length < 2 && (!c.dangling || chosenOrders.has(c.order - 1))) take(c);

  chosen.sort((a, b) => a.order - b.order);
  const cap = chosen.length <= 2 ? 240 : chosen.length <= 4 ? 185 : 150;
  return chosen.map((c) => tighten(c.text, cap));
}

/** Plain truncation for short labels such as table cells. */
export function shorten(text: string, max: number): string {
  const t = cleanText(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max * 0.5 ? space : cut.length).trim()}…`;
}

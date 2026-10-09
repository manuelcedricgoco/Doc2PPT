import type { DocumentAnalysis, PresentationCategory, SectionRole } from "../types/analysis";
import type { ParsedDocument } from "../types/document";
import type { PresentationLength, PresentationType } from "../types";
import type { PlannedSlide, SkippedSection, SlideOutline } from "../types/outline";
import { cleanHeading, countWords } from "../utils/text";
import { looksLikeByline } from "../utils/byline";
import { TEMPLATES, TYPE_TO_CATEGORY } from "./templates";

export const LENGTH_RANGES: Record<PresentationLength, { min: number; max: number; label: string }> = {
  short: { min: 5, max: 7, label: "Short" },
  standard: { min: 8, max: 12, label: "Standard" },
  detailed: { min: 12, max: 20, label: "Detailed" },
};

const MAX_TITLE = 70;
const SPLIT_WORDS = 260; // a slide with more source text than this is split when there is room
const MIN_PART_WORDS = 40; // never split into parts smaller than this
const CHUNK_WORDS = 150; // target size when a document has no headings

/** A slide being planned. Points at exact source paragraphs and tables, so nothing is rewritten or lost. */
interface Draft {
  baseTitle: string;
  titles: string[];
  titleSource: "template" | "document";
  slotId?: string;
  role?: SectionRole;
  sectionIds: number[];
  paragraphIds: number[];
  tableIds: number[];
  words: number;
  important: boolean;
  splitGroup?: number;
}

export interface OutlineOptions {
  type: PresentationType;
  length: PresentationLength;
}

function shorten(title: string): string {
  if (title.length <= MAX_TITLE) return title;
  const cut = title.slice(0, MAX_TITLE - 1);
  return cut.slice(0, cut.lastIndexOf(" ") > 30 ? cut.lastIndexOf(" ") : cut.length).trim() + "…";
}

function composeTitle(titles: string[]): string {
  if (titles.length === 1) return titles[0];
  if (titles.length === 2) return `${titles[0]} & ${titles[1]}`;
  return `${titles[0]} to ${titles[titles.length - 1]}`;
}

/**
 * The document title. A title that is only the file name gets underscores and dashes turned into spaces, and a
 * byline (author, date, class section) is never used as a title: the first real heading is used instead.
 */
function displayTitle(doc: ParsedDocument): string {
  const stem = doc.metadata.fileName.replace(/\.[^.]+$/, "");
  const prettyStem = stem.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || stem;
  if (!doc.title) return "Untitled presentation";
  if (looksLikeByline(doc.title)) {
    const heading = doc.sections.find((s) => s.heading && !looksLikeByline(s.heading))?.heading;
    return heading ? cleanHeading(heading) : prettyStem;
  }
  return doc.title === stem ? prettyStem : doc.title;
}

export function buildSlideOutline(doc: ParsedDocument, analysis: DocumentAnalysis, options: OutlineOptions): SlideOutline {
  const category: PresentationCategory = options.type === "Auto Detect" ? analysis.category : TYPE_TO_CATEGORY[options.type];
  const template = TEMPLATES[category];
  const range = LENGTH_RANGES[options.length];
  const notes: string[] = [];
  const skipped: SkippedSection[] = [];

  // ---- word counting straight from the source ----
  const paraWords = (id: number) => countWords(doc.paragraphs[id].text);
  const tableWords = (id: number) => doc.tables[id].rows.reduce((n, r) => n + r.reduce((m, c) => m + countWords(c), 0), 0);
  const wordsOf = (pIds: number[], tIds: number[]) =>
    pIds.reduce((n, id) => n + paraWords(id), 0) + tIds.reduce((n, id) => n + tableWords(id), 0);

  const openingSlot = template.slots.find((s) => s.id === template.openingSlot)!;
  let drafts: Draft[] = [];

  const structured = doc.sections.some((s) => s.heading);

  if (!structured) {
    // ---- No headings at all: split the text into even groups of paragraphs ----
    const ids = doc.paragraphs.map((p) => p.id);
    const total = wordsOf(ids, doc.tables.map((t) => t.id));
    const groups = Math.min(10, Math.max(1, Math.ceil(total / CHUNK_WORDS)));
    const target = total / groups;
    const labels = [openingSlot.title, "Key Points", "Important Details"];
    let current: number[] = [];
    let acc = 0;
    const flush = () => {
      if (!current.length) return;
      const i = drafts.length;
      const title = labels[i] ?? `More Details${i - 2 > 1 ? ` (${i - 2})` : ""}`;
      drafts.push({
        baseTitle: title, titles: [title], titleSource: "template", slotId: i === 0 ? openingSlot.id : undefined,
        sectionIds: doc.sections.map((s) => s.id), paragraphIds: current, tableIds: [],
        words: acc, important: i === 0, role: undefined,
      });
      current = [];
      acc = 0;
    };
    for (const id of ids) {
      current.push(id);
      acc += paraWords(id);
      if (acc >= target && drafts.length < groups - 1) flush();
    }
    flush();
    if (drafts.length && doc.tables.length) {
      const last = drafts[drafts.length - 1];
      last.tableIds = doc.tables.map((t) => t.id);
      last.words += wordsOf([], last.tableIds);
    }
  } else {
    // ---- Assign each section to a template slide, or to a slide of its own ----
    interface Unit {
      key: string;
      slotIndex: number; // -1 for sections that fit no standard slide
      anchor: number; // for own-slide units: index of the slot just before it in the document
      sectionIds: number[];
    }
    const units = new Map<string, Unit>();
    const assigned = new Map<number, string>();
    const stack: { id: number; level: number }[] = [];
    let lastSlot = -1;

    for (const s of doc.sections) {
      while (stack.length && stack[stack.length - 1].level >= s.level) stack.pop();
      const parent = stack[stack.length - 1];
      stack.push({ id: s.id, level: s.level });

      const role = analysis.sections[s.id].role;
      const parentKey = parent ? assigned.get(parent.id) : undefined;

      if (role === "references" || parentKey === "skip") {
        if (role === "references") skipped.push({ sectionId: s.id, heading: s.heading, reason: "References and appendices are not turned into slides." });
        assigned.set(s.id, "skip");
        continue;
      }

      const slotIndex = role === "opening" ? template.slots.indexOf(openingSlot) : template.slots.findIndex((sl) => sl.roles.includes(role));
      let key: string;
      if (slotIndex >= 0) {
        key = `slot-${slotIndex}`;
        lastSlot = slotIndex;
        if (!units.has(key)) units.set(key, { key, slotIndex, anchor: slotIndex, sectionIds: [] });
      } else if (s.level > 1 && role === "other" && parentKey) {
        key = parentKey; // a subsection stays with its parent's slide
      } else {
        key = `own-${s.id}`;
        units.set(key, { key, slotIndex: -1, anchor: lastSlot, sectionIds: [] });
      }
      units.get(key)!.sectionIds.push(s.id);
      assigned.set(s.id, key);
    }

    // Order: template order, with own-slide sections placed after the slot that precedes them in the document.
    const all = [...units.values()];
    const ordered: Unit[] = [...all.filter((u) => u.slotIndex < 0 && u.anchor === -1)];
    template.slots.forEach((_, i) => {
      const slot = all.find((u) => u.slotIndex === i);
      if (slot) ordered.push(slot);
      ordered.push(...all.filter((u) => u.slotIndex < 0 && u.anchor === i));
    });

    for (const u of ordered) {
      const secs = u.sectionIds.map((id) => doc.sections[id]);
      const paragraphIds = secs.flatMap((s) => s.paragraphIds);
      const tableIds = secs.flatMap((s) => s.tableIds);
      const words = wordsOf(paragraphIds, tableIds);
      if (words === 0) continue; // never plan an empty slide
      const slot = u.slotIndex >= 0 ? template.slots[u.slotIndex] : undefined;
      // A byline line (author, date, section) is not a real heading, so it never names a slide.
      const headed = secs.filter((s) => s.heading && !looksLikeByline(s.heading));
      const own = cleanHeading(headed[0]?.heading ?? "");
      // Use the document's own heading when one section fills the slide; otherwise the standard name.
      const useDoc = headed.length >= 1 && (!slot || (headed.length === 1 && own.length <= 60));
      const title = useDoc ? own : slot?.title ?? "Overview";
      drafts.push({
        baseTitle: title, titles: [title], titleSource: useDoc ? "document" : "template",
        slotId: slot?.id, role: analysis.sections[secs[0].id].role,
        sectionIds: u.sectionIds, paragraphIds, tableIds, words, important: !!slot?.important,
      });
    }
  }

  // ---- Fit to the chosen length ----
  const total = () => drafts.length + 1; // +1 for the title slide
  const merge = () => {
    let best = -1;
    let bestCost = Infinity;
    for (let i = 0; i < drafts.length - 1; i++) {
      const a = drafts[i], b = drafts[i + 1];
      const cost = a.words + b.words + (a.important ? 200 : 0) + (b.important ? 200 : 0);
      if (cost < bestCost) { bestCost = cost; best = i; }
    }
    const a = drafts[best], b = drafts[best + 1];
    const titles = [...a.titles, ...b.titles];
    drafts.splice(best, 2, {
      baseTitle: composeTitle(titles), titles, titleSource: "document", slotId: undefined, role: undefined,
      sectionIds: [...a.sectionIds, ...b.sectionIds], paragraphIds: [...a.paragraphIds, ...b.paragraphIds],
      tableIds: [...a.tableIds, ...b.tableIds], words: a.words + b.words, important: a.important || b.important,
    });
  };

  let groupCounter = 0;
  /** Splits one slide in two, by section if it has several, otherwise at a paragraph boundary near the middle. */
  const trySplit = (d: Draft): Draft[] | null => {
    const withContent = d.sectionIds.map((id) => doc.sections[id]).filter((s) => wordsOf(s.paragraphIds, s.tableIds) > 0);
    if (withContent.length >= 2 && structuredSectionsDistinct(d)) {
      return withContent.map((s) => {
        const words = wordsOf(s.paragraphIds, s.tableIds);
        const realHeading = s.heading && !looksLikeByline(s.heading) ? s.heading : null;
        const title = realHeading ? cleanHeading(realHeading) : d.baseTitle;
        return {
          baseTitle: title, titles: [title], titleSource: realHeading ? "document" : d.titleSource, slotId: undefined,
          role: analysis.sections[s.id].role, sectionIds: [s.id], paragraphIds: s.paragraphIds, tableIds: s.tableIds,
          words, important: d.important,
        } as Draft;
      });
    }
    if (d.paragraphIds.length < 2) return null;
    let acc = 0;
    let bestAt = -1;
    let bestDiff = Infinity;
    for (let i = 0; i < d.paragraphIds.length - 1; i++) {
      acc += paraWords(d.paragraphIds[i]);
      const rest = d.words - wordsOf([], d.tableIds) - acc;
      if (acc >= MIN_PART_WORDS && rest >= MIN_PART_WORDS && Math.abs(acc - rest) < bestDiff) { bestDiff = Math.abs(acc - rest); bestAt = i; }
    }
    if (bestAt < 0) return null;
    const first = d.paragraphIds.slice(0, bestAt + 1);
    const second = d.paragraphIds.slice(bestAt + 1);
    const group = d.splitGroup ?? ++groupCounter;
    return [
      { ...d, paragraphIds: first, tableIds: d.tableIds, words: wordsOf(first, d.tableIds), splitGroup: group },
      { ...d, paragraphIds: second, tableIds: [], words: wordsOf(second, []), splitGroup: group },
    ];
  };
  // Sections already split from each other are not "several sections" any more.
  const structuredSectionsDistinct = (d: Draft) => d.sectionIds.length >= 2;

  const splitLargest = (minWords: number): boolean => {
    const candidates = drafts
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.words >= minWords)
      .sort((a, b) => b.d.words - a.d.words);
    for (const { d, i } of candidates) {
      const parts = trySplit(d);
      if (parts && drafts.length - 1 + parts.length + 1 <= range.max) {
        drafts.splice(i, 1, ...parts);
        return true;
      }
    }
    return false;
  };

  let merged = false;
  while (total() > range.max && drafts.length > 1) { merge(); merged = true; }
  if (!merged) {
    while (total() < range.min && splitLargest(MIN_PART_WORDS * 2)) { /* keep splitting */ }
    while (total() < range.max && splitLargest(SPLIT_WORDS)) { /* long slides get split while there is room */ }
  }

  if (merged) notes.push(`Some sections were combined so the presentation fits the ${range.label} length (${range.min} to ${range.max} slides).`);
  if (total() < range.min) {
    notes.push(`This document has limited content, so ${total()} slides are planned instead of ${range.min} to ${range.max}. Slides are never padded with invented content.`);
  }
  if (!structured) notes.push("This document has no headings, so its text was divided into even groups.");

  // ---- Finalize: part labels, numbering, title slide ----
  const groupSize = new Map<number, number>();
  drafts.forEach((d) => d.splitGroup && groupSize.set(d.splitGroup, (groupSize.get(d.splitGroup) ?? 0) + 1));
  const seen = new Map<number, number>();

  const slides: PlannedSlide[] = [
    {
      id: "slide-1", number: 1, kind: "title", title: shorten(displayTitle(doc)), titleSource: "document",
      sourceSectionIds: [], paragraphIds: [], tableIds: [], sourceWords: 0,
    },
  ];
  drafts.forEach((d) => {
    let title = d.baseTitle;
    if (d.splitGroup) {
      const idx = (seen.get(d.splitGroup) ?? 0) + 1;
      seen.set(d.splitGroup, idx);
      title = `${d.baseTitle} (${idx} of ${groupSize.get(d.splitGroup)})`;
    }
    const n = slides.length + 1;
    slides.push({
      id: `slide-${n}`, number: n, kind: "content", title: shorten(title), titleSource: d.titleSource, slotId: d.slotId,
      role: d.role, sourceSectionIds: d.sectionIds, paragraphIds: d.paragraphIds, tableIds: d.tableIds, sourceWords: d.words,
    });
  });

  return { category, length: options.length, range: { min: range.min, max: range.max }, slides, skipped, notes };
}

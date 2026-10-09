import type { PresentationCategory, SectionRole } from "../types/analysis";
import type { ParsedDocument } from "../types/document";
import type { SlideOutline, PlannedSlide } from "../types/outline";
import type { VisualStyle } from "../types";
import { CATEGORY_LABELS, ROLE_LABELS } from "../utils/categories";
import { looksLikeByline, parseByline } from "../utils/byline";
import { buildWeights, cleanText, pickKeySentences, shorten, type SourceParagraph } from "./summarize";

export type SlideLayout = "title" | "bullets" | "cards" | "table" | "section";

export interface GeneratedTable {
  headers: string[];
  rows: string[][];
}

/**
 * One slide, as shown in the editable preview.
 * - title slide: `subtitle` is the small label above the title, `bullets` are the byline lines (author, class, date)
 * - content slides: `subtitle` is the small label above the title (hidden when empty), `bullets` are the key points
 * - `script` holds the speaker notes, which include the full source text of the slide
 */
export interface GeneratedSlide {
  id: string;
  number: number;
  kind: PlannedSlide["kind"];
  title: string;
  subtitle?: string;
  layout: SlideLayout;
  bullets: string[];
  table?: GeneratedTable;
  sourceLabel: string;
  script: string;
}

export interface GeneratedPresentation {
  title: string;
  category: PresentationCategory;
  visualStyle: VisualStyle;
  slides: GeneratedSlide[];
}

const MAX_TABLE_COLUMNS = 4;
const MAX_TABLE_ROWS = 5;
const MAX_NOTES_CHARS = 3000;

const ROLE_LAYOUTS: Partial<Record<SectionRole, SlideLayout>> = {
  overview: "cards",
  objectives: "cards",
  features: "cards",
  methodology: "section",
  techstack: "cards",
  results: "table",
  financial: "table",
  metrics: "table",
  conclusion: "section",
  recommendations: "cards",
};

/** Section roles whose label says nothing useful above a slide title. */
const HIDDEN_ROLE_LABELS = new Set<SectionRole>(["other", "opening"]);

function makeSourceLabel(doc: ParsedDocument, slide: PlannedSlide): string {
  if (slide.kind === "title") return doc.metadata.fileName;
  const names = slide.sourceSectionIds.map((id) => doc.sections[id]?.heading ?? "Opening text");
  const unique = [...new Set(names)];
  return unique.length > 2 ? `${unique.slice(0, 2).join(", ")} and ${unique.length - 2} more` : unique.join(", ");
}

function tableForSlide(doc: ParsedDocument, slide: PlannedSlide): GeneratedTable | undefined {
  const source = slide.tableIds.map((id) => doc.tables[id]).find((table) => table?.rows.length);
  if (!source) return undefined;

  const rows = source.rows
    .map((row) => row.slice(0, MAX_TABLE_COLUMNS).map((cell) => shorten(cell, 56)))
    .filter((row) => row.some(Boolean));
  if (!rows.length) return undefined;

  const first = rows[0];
  const headers = source.hasHeader
    ? first
    : first.map((_, index) => `Column ${index + 1}`);
  const body = (source.hasHeader ? rows.slice(1) : rows).slice(0, MAX_TABLE_ROWS);

  return { headers, rows: body };
}

function slideParagraphs(doc: ParsedDocument, slide: PlannedSlide, byline: string | undefined): SourceParagraph[] {
  return slide.paragraphIds
    .map((id) => doc.paragraphs[id])
    .filter((p) => p && !(byline && cleanText(p.text) === byline))
    .map((p) => ({ text: p.text, type: p.type }));
}

function bulletsForSlide(
  doc: ParsedDocument,
  slide: PlannedSlide,
  weights: Map<string, number>,
  byline: string | undefined,
  layout: SlideLayout,
  extra = 0,
): string[] {
  // Three to five points depending on how much the passage says. Highlight and table slides stay short.
  const wanted = Math.min(5, Math.max(3, Math.round(slide.sourceWords / 38)));
  const maxItems = layout === "section" ? 3 : layout === "table" ? 2 : Math.min(6, wanted + extra);
  const bullets = pickKeySentences(slideParagraphs(doc, slide, byline), weights, {
    maxItems,
    maxChars: layout === "section" ? 460 : 640,
  });

  if (!bullets.length) {
    const table = tableForSlide(doc, slide);
    table?.rows.flat().slice(0, 4).forEach((cell) => {
      const text = cleanText(cell);
      if (text && !bullets.includes(text)) bullets.push(text);
    });
  }
  return bullets;
}

/** Continuation slides of one long section are titled "Section (2 of 4)", which repeats the same title. */
const PART_SUFFIX = /^(.*?)\s*\((\d+)\s+of\s+(\d+)\)\s*$/i;
const MAX_CLAIM_TITLE = 125;

/**
 * For a continuation slide, the lead sentence becomes the slide's headline, so every slide in the run has its own
 * title. The section name and part number move to the small label above it. The slide keeps at least three points.
 */
function withClaimTitle(title: string, bullets: string[]): { title: string; subtitle?: string; bullets: string[] } | undefined {
  const match = title.match(PART_SUFFIX);
  if (!match || !match[1] || bullets.length < 3) return undefined;
  const lead = bullets[0].replace(/[.\s]+$/, "");
  if (lead.length > MAX_CLAIM_TITLE) return undefined;
  return {
    title: lead,
    subtitle: `${match[1]} \u00b7 Part ${match[2]} of ${match[3]}`,
    bullets: bullets.slice(1),
  };
}

function layoutFor(slide: PlannedSlide, table: GeneratedTable | undefined): SlideLayout {
  if (slide.kind === "title") return "title";
  if (table && (slide.role === "results" || slide.role === "financial" || slide.role === "metrics" || slide.tableIds.length > 0)) {
    return "table";
  }
  return slide.role ? ROLE_LAYOUTS[slide.role] ?? "bullets" : "bullets";
}

/** The first line near the top of the document that reads like an author/date/section line. */
function findByline(doc: ParsedDocument): string | undefined {
  const candidates = [
    doc.title,
    ...doc.sections.slice(0, 3).map((s) => s.heading),
    ...doc.paragraphs.slice(0, 2).map((p) => p.text),
  ];
  const found = candidates.find((c) => looksLikeByline(c));
  return found ? cleanText(found) : undefined;
}

function bylineLines(byline: string | undefined): string[] {
  if (!byline) return [];
  const { name, details } = parseByline(byline);
  return [name, details.join("  \u00b7  ")].filter(Boolean);
}

export function buildSlideScript(doc: ParsedDocument, slide: PlannedSlide): string {
  if (slide.kind === "title") return cleanText(slide.title);

  const paragraphs = slide.paragraphIds
    .map((id) => doc.paragraphs[id])
    .filter(Boolean)
    .map((p) => (p.type === "list-item" ? `\u2022 ${cleanText(p.text)}` : cleanText(p.text)));
  const tables = slide.tableIds
    .map((id) => doc.tables[id])
    .filter(Boolean)
    .map((t) => t.rows.map((row) => row.join(" | ")).join("\n"));

  const text = [...paragraphs, ...tables].join("\n\n").trim();
  if (!text) return cleanText(slide.title);
  if (text.length <= MAX_NOTES_CHARS) return text;
  const cut = text.slice(0, MAX_NOTES_CHARS);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trim()}\u2026`;
}

export function buildGeneratedPresentation(
  doc: ParsedDocument,
  outline: SlideOutline,
  visualStyle: VisualStyle,
): GeneratedPresentation {
  const deckTitle = outline.slides[0]?.title ?? doc.title ?? "Doc2PPT Presentation";
  const weights = buildWeights(doc.paragraphs.map((p) => p.text), deckTitle);
  const byline = findByline(doc);

  const slides = outline.slides.map((slide) => {
    if (slide.kind === "title") {
      return {
        id: slide.id,
        number: slide.number,
        kind: slide.kind,
        title: slide.title,
        subtitle: outline.category === "general" ? "Presentation" : CATEGORY_LABELS[outline.category],
        layout: "title",
        bullets: bylineLines(byline),
        sourceLabel: doc.metadata.fileName,
        script: buildSlideScript(doc, slide),
      } satisfies GeneratedSlide;
    }

    const table = tableForSlide(doc, slide);
    const layout = layoutFor(slide, table);
    let title = slide.title;
    let subtitle = slide.role && !HIDDEN_ROLE_LABELS.has(slide.role) ? ROLE_LABELS[slide.role] : undefined;
    let bullets = bulletsForSlide(doc, slide, weights, byline, layout, PART_SUFFIX.test(slide.title) ? 1 : 0);
    if (layout !== "section" && layout !== "table") {
      const claim = withClaimTitle(title, bullets);
      if (claim) ({ title, subtitle, bullets } = { title: claim.title, subtitle: claim.subtitle, bullets: claim.bullets });
    }
    return {
      id: slide.id,
      number: slide.number,
      kind: slide.kind,
      title,
      subtitle,
      layout,
      bullets,
      table,
      sourceLabel: makeSourceLabel(doc, slide),
      script: buildSlideScript(doc, slide),
    } satisfies GeneratedSlide;
  });

  return {
    title: deckTitle,
    category: outline.category,
    visualStyle,
    slides,
  };
}

import pptxgen from "pptxgenjs";
import type { GeneratedPresentation, GeneratedSlide } from "./generatedPresentation";
import { resolvePresentationTheme, type PresentationTheme } from "./presentationThemes";

// ---------------------------------------------------------------------------------------------------------
// Page geometry (inches). 16:9 widescreen.
// ---------------------------------------------------------------------------------------------------------
const W = 13.333;
const H = 7.5;
const M = 0.75; // side margin
const CW = W - 2 * M; // content width
const BODY_TOP = 2.2;
const BODY_BOTTOM = 6.65;
const BODY_H = BODY_BOTTOM - BODY_TOP;
const MAX_POINTS = 6;

const SHAPE = { rect: "rect", roundRect: "roundRect", ellipse: "ellipse" } as const;

// `slide` and shape options are loosely typed on purpose: pptxgenjs ships broad option types, and every call
// below is covered by the visual check in `npm run preview:deck`.
/* eslint-disable @typescript-eslint/no-explicit-any */
interface Ctx {
  slide: any;
  theme: PresentationTheme;
}

type Variant = "title" | "statement" | "duo" | "cards3" | "cards4" | "points" | "highlight" | "table";

// ---------------------------------------------------------------------------------------------------------
// Text fitting. PowerPoint and WPS do not reliably shrink text to fit a box, so sizes are chosen here from an
// estimate of how Calibri wraps. The estimate is deliberately a little pessimistic.
// ---------------------------------------------------------------------------------------------------------
const GLYPH_EM = 0.5; // average glyph width / font size, regular
const GLYPH_EM_BOLD = 0.54;

function wrapLines(text: string, pt: number, widthIn: number, bold = false): number {
  const perLine = Math.max(4, Math.floor(widthIn / ((pt / 72) * (bold ? GLYPH_EM_BOLD : GLYPH_EM))));
  let lines = 1;
  let current = 0;
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if (current === 0) current = word.length;
    else if (current + 1 + word.length <= perLine) current += 1 + word.length;
    else {
      lines++;
      current = word.length;
    }
    while (current > perLine) {
      lines++;
      current -= perLine;
    }
  }
  return lines;
}

const textHeight = (lines: number, pt: number, spacing = 1.2) => (lines * pt * spacing) / 72;

/** Largest size between `max` and `min` at which all the texts together fit the box. */
function fitTogether(texts: string[], w: number, h: number, max: number, min: number, bold = false, gap = 0): number {
  for (let pt = max; pt >= min; pt--) {
    const total = texts.reduce((sum, t) => sum + textHeight(wrapLines(t, pt, w, bold), pt), 0) + gap * (texts.length - 1);
    if (total <= h) return pt;
  }
  return min;
}

/** Largest size at which every text fits the box on its own, so a row of cards shares one size. */
function fitEach(texts: string[], w: number, h: number, max: number, min: number): number {
  return texts.reduce((size, t) => Math.min(size, fitTogether([t], w, h, max, min)), max);
}

// ---------------------------------------------------------------------------------------------------------
// Small drawing helpers
// ---------------------------------------------------------------------------------------------------------
const cardShadow = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 8, offset: 2, angle: 90 });

function card(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, options: { line?: string; shadow?: boolean; radius?: number } = {}) {
  ctx.slide.addShape(SHAPE.roundRect, {
    x, y, w, h,
    rectRadius: options.radius ?? 0.14,
    fill: { color: fill },
    line: options.line ? { color: options.line, width: 1 } : { type: "none" },
    ...(options.shadow ? { shadow: cardShadow() } : {}),
  });
}

function circle(ctx: Ctx, x: number, y: number, d: number, fill: string, transparency = 0) {
  ctx.slide.addShape(SHAPE.ellipse, { x, y, w: d, h: d, fill: { color: fill, transparency }, line: { type: "none" } });
}

function badge(ctx: Ctx, x: number, y: number, d: number, label: string, fill: string, color: string, pt: number) {
  ctx.slide.addText(label, {
    shape: SHAPE.ellipse,
    x, y, w: d, h: d,
    fill: { color: fill },
    line: { type: "none" },
    align: "center",
    valign: "middle",
    fontFace: ctx.theme.headFont,
    fontSize: pt,
    bold: true,
    color,
    margin: 0,
  });
}

function text(ctx: Ctx, value: string, x: number, y: number, w: number, h: number, pt: number, options: Record<string, unknown> = {}) {
  ctx.slide.addText(value, {
    x, y, w, h,
    fontFace: ctx.theme.bodyFont,
    fontSize: pt,
    color: ctx.theme.ink,
    align: "left",
    valign: "middle",
    margin: 0,
    isTextBox: true,
    ...options,
  });
}

function shortTitle(title: string, max = 70): string {
  return title.length <= max ? title : `${title.slice(0, max - 1).trim()}…`;
}

function safeFileName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim();
  return `${cleaned || "Doc2PPT-Presentation"}.pptx`;
}

/** "Title (2 of 4)" becomes the plain title plus a part marker shown above it. */
function splitPart(title: string): { title: string; part?: string } {
  const match = title.match(/^(.*?)\s*\((\d+)\s+of\s+(\d+)\)\s*$/i);
  return match && match[1] ? { title: match[1], part: `Part ${match[2]} of ${match[3]}` } : { title };
}

// ---------------------------------------------------------------------------------------------------------
// Shared frame for light content slides
// ---------------------------------------------------------------------------------------------------------
function footer(ctx: Ctx, deckTitle: string, onDark: boolean) {
  const color = onDark ? ctx.theme.heroMuted : ctx.theme.muted;
  text(ctx, shortTitle(deckTitle), M, 6.98, 9, 0.3, 10, { color });
  ctx.slide.slideNumber = {
    x: W - M - 1, y: 6.98, w: 1, h: 0.3,
    fontFace: ctx.theme.bodyFont, fontSize: 10, color, align: "right", valign: "middle",
  };
}

function header(ctx: Ctx, title: string, kicker: string | undefined) {
  if (kicker) {
    text(ctx, kicker.toUpperCase(), M, 0.62, CW, 0.3, 12, { bold: true, color: ctx.theme.primary, charSpacing: 3 });
  }
  const size = fitTogether([title], CW, 1.0, 36, 24, true);
  text(ctx, title, M, 0.95, CW, 1.0, size, { fontFace: ctx.theme.headFont, bold: true, valign: "top" });
}

// ---------------------------------------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------------------------------------
function renderTitleSlide(ctx: Ctx, current: GeneratedSlide, title: string) {
  const { theme } = ctx;
  ctx.slide.background = { color: theme.heroBg };

  circle(ctx, 7.35, 0.7, 5.6, theme.heroPanel);
  circle(ctx, 10.5, 4.55, 2.35, theme.accent, 8);

  if (current.subtitle) {
    circle(ctx, M, 1.64, 0.16, theme.accent);
    text(ctx, current.subtitle.toUpperCase(), M + 0.34, 1.55, 6, 0.34, 13, { bold: true, color: theme.heroMuted, charSpacing: 4 });
  }

  const titleW = 6.7;
  const size = fitTogether([title], titleW, 2.7, 50, 30, true);
  text(ctx, title, M, 2.1, titleW, 2.7, size, { fontFace: theme.headFont, bold: true, color: theme.heroInk, valign: "top" });

  const [first, ...rest] = current.bullets.map((b) => b.trim()).filter(Boolean);
  if (first) {
    text(ctx, first, M, 5.25, titleW, 0.5, 22, { bold: true, color: theme.heroInk });
    if (rest.length) text(ctx, rest.join("  \u00b7  "), M, 5.78, titleW, 0.4, 16, { color: theme.heroMuted });
  }
}

/** One or two points: a large lead statement, with the second point as support. */
function renderStatement(ctx: Ctx, items: string[]) {
  const { theme } = ctx;
  const [lead, support] = items;
  const leadH = support ? 2.55 : 3.7;
  card(ctx, M, BODY_TOP, CW, leadH, theme.soft, { radius: 0.2 });

  const d = 0.8;
  badge(ctx, M + 0.45, BODY_TOP + (leadH - d) / 2, d, "01", theme.primary, theme.onPrimary, 20);
  const tx = M + 0.45 + d + 0.45;
  const tw = W - M - 0.5 - tx;
  const size = fitTogether([lead], tw, leadH - 0.5, 32, 20);
  text(ctx, lead, tx, BODY_TOP + 0.25, tw, leadH - 0.5, size);

  if (support) {
    const y = BODY_TOP + leadH + 0.3;
    const h = BODY_BOTTOM - y;
    card(ctx, M, y, CW, h, theme.surface, { line: theme.line, shadow: true });
    badge(ctx, M + 0.45, y + (h - d) / 2, d, "02", theme.primary, theme.onPrimary, 20);
    const sw = W - M - 0.5 - tx;
    const ssize = fitTogether([support], sw, h - 0.4, 26, 16);
    text(ctx, support, tx, y + 0.2, sw, h - 0.4, ssize);
  }
}

/** Column cards (two or three across): badge on top, text below. Cards are only as tall as their text needs. */
function renderColumns(ctx: Ctx, items: string[], maxSize: number, minSize: number) {
  const { theme } = ctx;
  const gap = 0.3;
  const n = items.length;
  const cardW = (CW - (n - 1) * gap) / n;
  const maxH = n === 2 ? 3.7 : 4.0;
  const tw = cardW - 0.7;
  const size = fitEach(items, tw, maxH - 1.65, maxSize, minSize);
  const textH = Math.max(...items.map((t) => textHeight(wrapLines(t, size, tw), size)));
  const h = Math.min(maxH, Math.max(2.9, 1.3 + textH + 0.5));
  items.forEach((item, i) => {
    const x = M + i * (cardW + gap);
    card(ctx, x, BODY_TOP, cardW, h, theme.surface, { line: theme.line, shadow: true });
    badge(ctx, x + 0.35, BODY_TOP + 0.35, 0.7, String(i + 1).padStart(2, "0"), theme.primary, theme.onPrimary, 18);
    text(ctx, item, x + 0.35, BODY_TOP + 1.3, tw, h - 1.65, size, { valign: "top" });
  });
}

/** Four points as a 2 x 2 grid. */
function renderCards4(ctx: Ctx, items: string[]) {
  const { theme } = ctx;
  const gap = 0.3;
  const cardW = (CW - gap) / 2;
  const h = (BODY_H - gap) / 2;
  const d = 0.62;
  const textOffset = 0.3 + d + 0.3;
  const tw = cardW - textOffset - 0.3;
  const size = fitEach(items, tw, h - 0.3, 20, 15);
  items.forEach((item, i) => {
    const x = M + (i % 2) * (cardW + gap);
    const y = BODY_TOP + Math.floor(i / 2) * (h + gap);
    card(ctx, x, y, cardW, h, theme.surface, { line: theme.line, shadow: true });
    badge(ctx, x + 0.3, y + (h - d) / 2, d, String(i + 1).padStart(2, "0"), theme.primary, theme.onPrimary, 16);
    text(ctx, item, x + textOffset, y + 0.15, tw, h - 0.3, size);
  });
}

/** Three to six points as numbered rows. */
function renderPoints(ctx: Ctx, items: string[]) {
  const { theme } = ctx;
  const n = items.length;
  const gap = n > 4 ? 0.14 : 0.2;
  const rowH = Math.min(1.3, (BODY_H - gap * (n - 1)) / n);
  const d = Math.min(0.62, rowH - 0.2);
  const tx = M + 0.3 + d + 0.3;
  const tw = W - M - 0.3 - tx;
  const size = fitEach(items, tw, rowH - 0.14, 20, 14);
  items.forEach((item, i) => {
    const y = BODY_TOP + i * (rowH + gap);
    card(ctx, M, y, CW, rowH, theme.surface, { line: theme.line, shadow: true });
    badge(ctx, M + 0.3, y + (rowH - d) / 2, d, String(i + 1), theme.primary, theme.onPrimary, 16);
    text(ctx, item, tx, y + 0.07, tw, rowH - 0.14, size);
  });
}

/** Dark slide with the title on the left and up to three points on the right. */
function renderHighlight(ctx: Ctx, title: string, kicker: string | undefined, items: string[]) {
  const { theme } = ctx;
  ctx.slide.background = { color: theme.heroBg };

  circle(ctx, M, 5.45, 1.3, theme.heroPanel);
  if (kicker) {
    circle(ctx, M, 0.9, 0.2, theme.accent);
    text(ctx, kicker.toUpperCase(), M + 0.38, 0.8, 5, 0.4, 12, { bold: true, color: theme.heroMuted, charSpacing: 3 });
  }

  const titleW = 4.9;
  const size = fitTogether([title], titleW, 3.6, 40, 26, true);
  text(ctx, title, M, 1.6, titleW, 3.6, size, { fontFace: theme.headFont, bold: true, color: theme.heroInk, valign: "top" });

  const x = 6.55;
  const w = W - M - x;
  const gap = 0.25;
  const n = items.length;
  const cardH = Math.min(n === 1 ? 3.2 : n === 2 ? 2.3 : 1.9, (5.0 - gap * (n - 1)) / n);
  const showBadge = n > 1;
  const d = 0.5;
  const tx = x + (showBadge ? 0.3 + d + 0.3 : 0.5);
  const tw = w - (tx - x) - 0.4;
  const pt = fitEach(items, tw, cardH - 0.6, n === 1 ? 26 : n === 2 ? 24 : 22, 15);
  items.forEach((item, i) => {
    const y = 1.6 + i * (cardH + gap);
    card(ctx, x, y, w, cardH, theme.heroPanel, { radius: 0.16 });
    if (showBadge) badge(ctx, x + 0.3, y + (cardH - d) / 2, d, String(i + 1), theme.accent, theme.onAccent, 14);
    text(ctx, item, tx, y + 0.3, tw, cardH - 0.6, pt, { color: theme.heroInk });
  });
}

function renderTable(ctx: Ctx, current: GeneratedSlide, items: string[]) {
  const { theme } = ctx;
  const table = current.table!;
  const cols = Math.max(table.headers.length, 1);
  const pad = (row: string[]) => Array.from({ length: cols }, (_, i) => row[i] ?? "");
  const headers = pad(table.headers);
  let rows = table.rows.map(pad);

  const lengths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const weights = lengths.map((l) => Math.min(Math.max(l, 8), 40));
  const total = weights.reduce((a, b) => a + b, 0);
  const colW = weights.map((wt) => (CW * wt) / total);

  const heights = (pt: number, body: string[][]) => [headers, ...body].map((row, r) =>
    Math.max(...row.map((cell, i) => textHeight(wrapLines(cell, pt, colW[i] - 0.3, r === 0), pt))) + 0.28,
  );

  // Short tables get larger text; long ones step down to 14pt.
  let pt = 20;
  while (pt > 14 && heights(pt, rows).reduce((a, b) => a + b, 0) > 3.8) pt--;
  while (rows.length > 1 && heights(pt, rows).reduce((a, b) => a + b, 0) > BODY_H) rows = rows.slice(0, -1);
  const rowH = heights(pt, rows);
  const tableH = rowH.reduce((a, b) => a + b, 0);

  const cell = (value: string, r: number, c: number) => ({
    text: value,
    options: {
      bold: r === 0 || c === 0,
      color: r === 0 ? theme.onPrimary : theme.ink,
      fill: { color: r === 0 ? theme.primary : r % 2 === 0 ? theme.soft : theme.surface },
      fontFace: theme.bodyFont,
      fontSize: pt,
      valign: "middle",
    },
  });
  ctx.slide.addTable(
    [headers.map((h, c) => cell(h, 0, c)), ...rows.map((row, r) => row.map((v, c) => cell(v, r + 1, c)))],
    { x: M, y: BODY_TOP, w: CW, colW, rowH, border: { type: "solid", color: theme.line, pt: 1 }, margin: [0.06, 0.12, 0.06, 0.12] },
  );

  const space = BODY_BOTTOM - (BODY_TOP + tableH * 1.08);
  if (items[0] && space >= 0.75) {
    const y = BODY_TOP + tableH * 1.08 + 0.2;
    text(ctx, items[0], M, y, CW, Math.min(0.9, BODY_BOTTOM - y), 16, { color: theme.muted, valign: "top" });
  }
}

// ---------------------------------------------------------------------------------------------------------
// Choosing a layout from the text that is actually on the slide (it may have been edited in the preview)
// ---------------------------------------------------------------------------------------------------------
function chooseVariant(current: GeneratedSlide, items: string[], previous: Variant | undefined): Variant {
  if (current.layout === "title") return "title";
  if (current.layout === "table" && current.table) return "table";

  const n = items.length;
  const longest = Math.max(0, ...items.map((i) => i.length));
  const total = items.reduce((sum, i) => sum + i.length, 0);
  const cardsFit = (n === 3 || n === 4) && longest <= 170;
  const cards: Variant = n === 3 ? "cards3" : "cards4";
  const rowish = (v: Variant | undefined) => v === "points" || v === "cards3" || v === "cards4";

  if (current.layout === "section" && n >= 1 && n <= 3 && total <= 520 && previous !== "highlight" && previous !== "title") {
    return "highlight";
  }
  if (n <= 2) return n === 2 && previous === "statement" ? "duo" : "statement";

  // Prefer the card styles for 3 and 4 points, but never repeat the same style on consecutive slides.
  let variant: Variant = cardsFit && current.layout !== "bullets" ? cards : "points";
  if (variant === previous && cardsFit && rowish(previous)) variant = previous === "points" ? cards : "points";
  if (variant === "points" && previous === "points" && cardsFit) variant = cards;
  return variant;
}

// ---------------------------------------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------------------------------------
export function buildPresentation(generated: GeneratedPresentation): pptxgen {
  const pptx = new pptxgen();
  const theme = resolvePresentationTheme(generated.category, generated.visualStyle);

  pptx.defineLayout({ name: "DOC2PPT_WIDE", width: W, height: H });
  pptx.layout = "DOC2PPT_WIDE";
  pptx.author = "Doc2PPT";
  pptx.company = "Doc2PPT";
  pptx.subject = "Created with Doc2PPT";
  pptx.title = generated.title;
  pptx.theme = { headFontFace: theme.headFont, bodyFontFace: theme.bodyFont };

  let previous: Variant | undefined;

  generated.slides.forEach((current) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    const ctx: Ctx = { slide, theme };

    const { title, part } = splitPart(current.title.trim());
    // A label that only repeats the title ("Conclusion" above "Conclusion") says nothing, so it is left out.
    const label = current.subtitle?.trim();
    const kicker =
      [label && label.toLowerCase() !== title.toLowerCase() ? label : undefined, part].filter(Boolean).join("  \u00b7  ") || undefined;
    const all = current.bullets.map((b) => b.trim()).filter(Boolean);
    const items = all.slice(0, MAX_POINTS);
    const variant = chooseVariant(current, items, previous);

    let notes = current.script;
    if (all.length > MAX_POINTS) notes += `\n\nMore points:\n${all.slice(MAX_POINTS).map((p) => `\u2022 ${p}`).join("\n")}`;

    if (variant === "title") {
      renderTitleSlide(ctx, current, title);
    } else if (variant === "highlight") {
      renderHighlight(ctx, title, kicker, items);
      footer(ctx, generated.title, true);
    } else {
      header(ctx, title, kicker);
      if (variant === "table") renderTable(ctx, current, items);
      else if (variant === "statement") renderStatement(ctx, items);
      else if (variant === "duo") renderColumns(ctx, items, 26, 16);
      else if (variant === "cards3") renderColumns(ctx, items, 22, 15);
      else if (variant === "cards4") renderCards4(ctx, items);
      else renderPoints(ctx, items);
      footer(ctx, generated.title, false);
    }

    slide.addNotes(notes);
    previous = variant;
  });

  return pptx;
}

export async function downloadPresentation(generated: GeneratedPresentation): Promise<string> {
  const pptx = buildPresentation(generated);
  const fileName = safeFileName(generated.title);
  await pptx.writeFile({ fileName, compression: true });
  return fileName;
}

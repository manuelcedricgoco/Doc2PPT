import { createRequire } from "node:module";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { MAX_PDF_PAGES } from "../config.js";
import { DocumentBuilder } from "../services/DocumentBuilder.js";
import type { ParseHooks, ParsedDocument } from "../types/document.js";
import { AppError } from "../utils/AppError.js";
import {
  isAllCapsHeading,
  looksLikeNumberedHeading,
  looksLikeTitleLine,
  MARKER_ONLY,
  normalizeText,
  numberingDepth,
  stripListMarker,
} from "../utils/text.js";

interface RawItem {
  str: string;
  width: number;
  height: number;
  transform: number[];
}
interface Cell { text: string; x0: number; x1: number }
interface Line {
  page: number;
  y: number;
  x0: number;
  size: number;
  text: string;
  cells: Cell[];
  gapBefore: number; // vertical distance to the previous line on the page (Infinity for the first)
  firstOnPage: boolean;
}

const require = createRequire(import.meta.url);
const FONT_DIR = path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "standard_fonts") + path.sep;

const SENTENCE_END = /[.!?:"”')\]]$/;
const NUMERIC_CELL = /^[\d.,%₱$€£()\-+\s]+$/;
const PAGE_NUMBER = /^(?:page\s+)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?$/i;

/** Groups the text items of one page into visual lines, then into cells (column gaps). */
function buildPageLines(items: RawItem[], page: number): Line[] {
  const usable = items.filter(
    (i) => i.str.trim().length > 0 && Math.abs(i.transform[1]) <= Math.abs(i.transform[0]) * 0.5, // skip rotated text
  );
  const sized = usable.map((i) => ({
    ...i,
    x: i.transform[4],
    y: i.transform[5],
    size: i.height || Math.abs(i.transform[3]) || 10,
  }));
  sized.sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: (typeof sized)[] = [];
  for (const it of sized) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - it.y) <= Math.max(1.5, it.size * 0.35)) row.push(it);
    else rows.push([it]);
  }

  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    // The most common size in the line (by characters) ignores superscripts and the like.
    const bySize = new Map<number, number>();
    for (const it of row) {
      const k = Math.round(it.size * 2) / 2;
      bySize.set(k, (bySize.get(k) ?? 0) + it.str.length);
    }
    const size = [...bySize.entries()].sort((a, b) => b[1] - a[1])[0][0];

    const cells: Cell[] = [];
    for (const it of row) {
      const end = it.x + it.width;
      const last = cells[cells.length - 1];
      const gap = last ? it.x - last.x1 : 0;
      if (!last || gap > size * 1.5) {
        cells.push({ text: it.str, x0: it.x, x1: end });
      } else {
        const space = gap > size * 0.12 && !/\s$/.test(last.text) && !/^\s/.test(it.str) ? " " : "";
        last.text += space + it.str;
        last.x1 = end;
      }
    }
    cells.forEach((c) => (c.text = normalizeText(c.text)));
    // A bullet or number printed as its own cell belongs to the text beside it.
    if (cells.length > 1 && MARKER_ONLY.test(cells[0].text)) {
      cells[1] = { text: cells[0].text + " " + cells[1].text, x0: cells[0].x0, x1: cells[1].x1 };
      cells.shift();
    }
    return {
      page,
      y: row[0].y,
      x0: row[0].x,
      size,
      text: normalizeText(cells.map((c) => c.text).join(" ")),
      cells,
      gapBefore: Infinity,
      firstOnPage: false,
    };
  });
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
}

/** Removes running headers/footers and page numbers. */
function stripHeadersAndFooters(pages: Line[][]): Line[][] {
  const edge = (lines: Line[], i: number) => i < 2 || i >= lines.length - 2;
  const key = (l: Line) => l.text.toLowerCase().replace(/\d+/g, "#");
  const seen = new Map<string, Set<number>>();
  pages.forEach((lines, p) =>
    lines.forEach((l, i) => {
      if (!edge(lines, i)) return;
      if (!seen.has(key(l))) seen.set(key(l), new Set());
      seen.get(key(l))!.add(p);
    }),
  );
  const threshold = Math.max(3, Math.ceil(pages.length * 0.5));
  return pages.map((lines) =>
    lines.filter((l, i) => {
      if (!edge(lines, i)) return true;
      if (PAGE_NUMBER.test(l.text)) return false;
      return pages.length < 3 || (seen.get(key(l))?.size ?? 0) < threshold;
    }),
  );
}

function setGaps(lines: Line[]): void {
  lines.forEach((l, i) => {
    l.firstOnPage = i === 0;
    l.gapBefore = i === 0 ? Infinity : lines[i - 1].y - l.y;
  });
}

/** Finds runs of 3+ lines whose cells line up in columns. Returns start index -> end index (exclusive). */
function detectTables(lines: Line[]): Map<number, number> {
  const found = new Map<number, number>();
  for (let i = 0; i < lines.length; ) {
    const base = lines[i];
    let j = i;
    if (base.cells.length >= 2) {
      while (j < lines.length) {
        const l = lines[j];
        const tol = Math.max(10, l.size);
        const aligned =
          l.cells.length === base.cells.length &&
          l.cells.every((c, k) => Math.abs(c.x0 - base.cells[k].x0) <= tol || Math.abs(c.x1 - base.cells[k].x1) <= tol);
        if (!aligned || (j > i && l.gapBefore > l.size * 2.6)) break;
        j++;
      }
    }
    if (j - i >= 3) {
      found.set(i, j);
      i = j;
    } else i++;
  }
  return found;
}

export async function parsePdf(
  buffer: Buffer,
  fileName: string,
  fileSize: number,
  hooks: ParseHooks,
): Promise<ParsedDocument> {
  const task = getDocument({
    data: new Uint8Array(buffer), // copy: pdf.js takes ownership of the array it is given
    standardFontDataUrl: FONT_DIR,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });

  let doc;
  try {
    doc = await task.promise;
  } catch (err) {
    await task.destroy().catch(() => {});
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") {
      throw new AppError(
        "PASSWORD_PROTECTED",
        "This PDF is password-protected. Remove the password in a PDF viewer, then upload it again.",
      );
    }
    throw new AppError("CORRUPT_PDF", "This PDF can't be opened. It may be damaged or not a real PDF. Please try another file.");
  }

  try {
    const totalPages = doc.numPages;
    if (totalPages > MAX_PDF_PAGES) {
      throw new AppError(
        "DOCUMENT_TOO_LARGE",
        `This PDF has ${totalPages} pages. Doc2PPT can handle up to ${MAX_PDF_PAGES} pages. Try a shorter document or split it into parts.`,
      );
    }

    // 1. Extract raw text items page by page.
    const pages: Line[][] = [];
    for (let n = 1; n <= totalPages; n++) {
      if (hooks.isCancelled()) throw new Error("cancelled");
      hooks.onStage("extracting", { page: n, totalPages });
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.filter((i): i is typeof i & RawItem => "str" in i) as unknown as RawItem[];
      pages.push(buildPageLines(items, n));
      page.cleanup();
    }

    // 2. Work out structure.
    hooks.onStage("reading");
    const cleaned = stripHeadersAndFooters(pages);
    cleaned.forEach(setGaps);
    const all = cleaned.flat();

    const builder = new DocumentBuilder();
    const bodySize = mode(all.flatMap((l) => Array(Math.min(l.text.length, 200)).fill(l.size)));

    const isSizeHeading = (l: Line) => bodySize > 0 && l.size >= bodySize * 1.15 && looksLikeTitleLine(l.text);

    // Document title: the single largest line near the top of page 1 (joined if it wraps).
    // Title lines are not turned into a section.
    const titleLines = new Set<Line>();
    const first = cleaned[0]?.slice(0, 12) ?? [];
    const top = first.filter((l) => isSizeHeading(l) && l.size >= bodySize * 1.3).sort((a, b) => b.size - a.size)[0];
    const largestOverall = Math.max(0, ...all.filter(isSizeHeading).map((l) => l.size));
    if (top && top.size >= largestOverall) {
      const idx = first.indexOf(top);
      titleLines.add(top);
      let title = top.text;
      for (let k = idx + 1; k < first.length && first[k].size === top.size && first[k].gapBefore < top.size * 1.4 && !looksLikeNumberedHeading(first[k].text); k++) {
        title += " " + first[k].text;
        titleLines.add(first[k]);
      }
      builder.title = title;
    }

    const headingSizes = [...new Set(all.filter((l) => isSizeHeading(l) && !titleLines.has(l)).map((l) => l.size))].sort((a, b) => b - a);
    const sizeLevel = (size: number) => Math.min(headingSizes.indexOf(size) + 1, 3);

    // The open paragraph lives outside the page loop so it can continue onto the next page.
    type Open = { text: string; type: "paragraph" | "list-item"; x0: number; page: number; size: number };
    let cur: Open | null = null;
    const flush = () => {
      if (cur) builder.addParagraph(cur.text, cur.type, cur.page);
      cur = null;
    };
    const join = (a: string, b: string) => (/\p{L}-$/u.test(a) && /^\p{Ll}/u.test(b) ? a.slice(0, -1) + b : a + " " + b);

    for (const lines of cleaned) {
      if (lines.length === 0) continue;
      const margin = mode(lines.map((l) => Math.round(l.x0 / 2) * 2));
      const tables = detectTables(lines);
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (!l.text) continue;

        const tableEnd = tables.get(i);
        if (tableEnd) {
          flush();
          const rows = lines.slice(i, tableEnd).map((r) => r.cells.map((c) => c.text));
          const numeric = (r: string[]) => r.some((c) => NUMERIC_CELL.test(c));
          builder.addTable(rows, !numeric(rows[0]) && rows.slice(1).some(numeric), l.page);
          i = tableEnd - 1;
          continue;
        }

        if (titleLines.has(l)) continue;
        // Headings: larger text, or a numbered / all-caps line standing on its own.
        const standalone = l.gapBefore > l.size * 1.5;
        const sizeHeading = isSizeHeading(l);
        const patternHeading = standalone && (looksLikeNumberedHeading(l.text) || isAllCapsHeading(l.text));
        if (sizeHeading || patternHeading) {
          flush();
          let text = l.text;
          // A heading that wraps onto a second line at the same size.
          while (sizeHeading && lines[i + 1] && lines[i + 1].size === l.size && lines[i + 1].gapBefore < l.size * 1.4 && isSizeHeading(lines[i + 1])) {
            text += " " + lines[++i].text;
          }
          const depth = numberingDepth(l.text);
          const level = sizeHeading ? sizeLevel(l.size) : depth ? Math.min(depth, 4) : /^(chapter|part|kabanata)\b/i.test(l.text) ? 1 : 2;
          builder.startSection(text, level, l.page);
          continue;
        }

        const item = stripListMarker(l.text);
        if (item !== null && item.length > 0) {
          flush();
          cur = { text: item, type: "list-item", x0: l.x0, page: l.page, size: l.size };
          continue;
        }

        if (cur) {
          const c: Open = cur;
          const crossPage = l.firstOnPage;
          const continuesAcrossPage = crossPage && !SENTENCE_END.test(c.text) && /^\p{Ll}/u.test(l.text);
          const newBlock = crossPage ? !continuesAcrossPage : l.gapBefore > l.size * 1.65;
          const indented = l.x0 > margin + l.size * 0.8 && l.x0 < margin + l.size * 4 && SENTENCE_END.test(c.text);
          const sizeShift = Math.abs(l.size - c.size) > c.size * 0.15;
          const listContinuation = c.type === "list-item" && l.x0 > c.x0 + l.size * 0.3;
          const breaks = c.type === "list-item" ? !listContinuation || newBlock : newBlock || indented || sizeShift;
          if (!breaks) {
            c.text = join(c.text, l.text);
            continue;
          }
          flush();
        }
        cur = { text: l.text, type: "paragraph", x0: l.x0, page: l.page, size: l.size };
      }
    }
    flush();

    return builder.build({ fileName, fileType: "pdf", fileSize, pageCount: totalPages });
  } finally {
    await task.destroy().catch(() => {});
  }
}

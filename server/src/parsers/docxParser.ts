import mammoth from "mammoth";
import { parse, type HTMLElement } from "node-html-parser";
import { DocumentBuilder } from "../services/DocumentBuilder.js";
import type { ParseHooks, ParsedDocument } from "../types/document.js";
import { AppError } from "../utils/AppError.js";
import { isAllCapsHeading, looksLikeNumberedHeading, looksLikeTitleLine, normalizeText, numberingDepth, stripListMarker } from "../utils/text.js";

const NUMERIC_CELL = /^[\d.,%₱$€£()\-+\s]+$/;
const HEADING_TAG = /^h([1-6])$/;

export async function parseDocx(
  buffer: Buffer,
  fileName: string,
  fileSize: number,
  hooks: ParseHooks,
): Promise<ParsedDocument> {
  hooks.onStage("extracting");
  let html: string;
  try {
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: ["p[style-name='Title'] => h1.doc-title:fresh"],
        // Images are not used for slides yet; skipping them keeps memory small.
        convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
      },
    );
    html = result.value;
  } catch {
    throw new AppError(
      "CORRUPT_DOCX",
      "This DOCX can't be opened. It may be damaged or not a real Word document. Please try another file.",
    );
  }
  if (hooks.isCancelled()) throw new Error("cancelled");

  hooks.onStage("reading");
  const root = parse(html);
  const builder = new DocumentBuilder();
  const blocks = root.childNodes.filter((n): n is HTMLElement => n.nodeType === 1);
  const hasRealHeadings = blocks.some((b) => HEADING_TAG.test(b.tagName.toLowerCase()) && !b.classList.contains("doc-title"));

  const headingLevel = (text: string) =>
    numberingDepth(text) ? Math.min(numberingDepth(text)!, 4) : /^(chapter|part|kabanata)\b/i.test(text) ? 1 : 2;

  const addList = (list: HTMLElement) => {
    for (const li of list.childNodes.filter((n): n is HTMLElement => n.nodeType === 1 && (n as HTMLElement).tagName.toLowerCase() === "li")) {
      const nested: HTMLElement[] = [];
      let text = "";
      for (const child of li.childNodes) {
        if (child.nodeType === 1 && /^(ul|ol)$/i.test((child as HTMLElement).tagName)) nested.push(child as HTMLElement);
        else text += child.text;
      }
      builder.addParagraph(text, "list-item");
      nested.forEach(addList);
    }
  };

  for (const el of blocks) {
    const tag = el.tagName.toLowerCase();
    const text = normalizeText(el.text);

    const h = HEADING_TAG.exec(tag);
    if (h) {
      if (el.classList.contains("doc-title")) builder.title = text;
      else builder.startSection(text, Number(h[1]));
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      addList(el);
      continue;
    }
    if (tag === "table") {
      const rows = el.querySelectorAll("tr").map((tr) => tr.querySelectorAll("th, td").map((c) => normalizeText(c.text)));
      const hasTh = el.querySelectorAll("tr")[0]?.querySelectorAll("th").length > 0;
      const numeric = (r: string[]) => r.some((c) => NUMERIC_CELL.test(c));
      builder.addTable(rows, hasTh || (rows.length > 1 && !numeric(rows[0]) && rows.slice(1).some(numeric)));
      continue;
    }
    if (!text) continue;

    // Without Word heading styles, fall back on shape: bold-only, numbered or ALL-CAPS short lines.
    if (!hasRealHeadings && looksLikeTitleLine(text)) {
      const boldOnly = el.childNodes.length > 0 && el.childNodes.every((c) => c.nodeType === 3 ? !c.text.trim() : /^(strong|b)$/i.test((c as HTMLElement).tagName));
      if (boldOnly || looksLikeNumberedHeading(text) || isAllCapsHeading(text)) {
        builder.startSection(text, headingLevel(text));
        continue;
      }
    }
    const item = stripListMarker(text);
    if (item) builder.addParagraph(item, "list-item");
    else builder.addParagraph(text, "paragraph");
  }

  return builder.build({ fileName, fileType: "docx", fileSize });
}

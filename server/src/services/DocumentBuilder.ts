import type {
  DocumentMetadata,
  DocumentParagraph,
  DocumentSection,
  DocumentTable,
  ParsedDocument,
} from "../types/document.js";
import { countWords, normalizeText } from "../utils/text.js";

/** Collects parsed blocks in reading order and produces the normalized structure. */
export class DocumentBuilder {
  private sections: DocumentSection[] = [];
  private paragraphs: DocumentParagraph[] = [];
  private tables: DocumentTable[] = [];
  private words = 0;
  title?: string;

  private current(page?: number): DocumentSection {
    if (this.sections.length === 0) this.startSection(null, 1, page);
    return this.sections[this.sections.length - 1];
  }

  startSection(heading: string | null, level: number, page?: number): void {
    const clean = heading === null ? null : normalizeText(heading);
    if (heading !== null && !clean) return;
    if (clean) this.words += countWords(clean);
    this.sections.push({
      id: this.sections.length,
      heading: clean,
      level: Math.min(Math.max(level, 1), 6),
      page,
      paragraphIds: [],
      tableIds: [],
    });
  }

  addParagraph(text: string, type: "paragraph" | "list-item", page?: number): void {
    const clean = normalizeText(text);
    if (!clean) return;
    const section = this.current(page);
    const id = this.paragraphs.length;
    this.paragraphs.push({ id, text: clean, type, sectionId: section.id, page });
    section.paragraphIds.push(id);
    this.words += countWords(clean);
  }

  addTable(rows: string[][], hasHeader: boolean, page?: number): void {
    const clean = rows
      .map((r) => r.map(normalizeText))
      .filter((r) => r.some((c) => c.length > 0));
    if (clean.length === 0) return;
    const section = this.current(page);
    const id = this.tables.length;
    this.tables.push({ id, rows: clean, hasHeader, sectionId: section.id, page });
    section.tableIds.push(id);
    for (const row of clean) for (const cell of row) this.words += countWords(cell);
  }

  get wordCount(): number {
    return this.words;
  }

  build(meta: Omit<DocumentMetadata, "wordCount">): ParsedDocument {
    const title =
      (this.title && normalizeText(this.title)) ||
      this.sections.find((s) => s.heading)?.heading ||
      meta.fileName.replace(/\.[^.]+$/, "");
    return {
      title,
      sections: this.sections,
      paragraphs: this.paragraphs,
      tables: this.tables,
      metadata: { ...meta, wordCount: this.words },
    };
  }
}

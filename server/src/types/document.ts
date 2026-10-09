// Normalized document structure produced by every parser.
// Later phases (analysis, slide structure) read only this shape.

export interface DocumentParagraph {
  id: number;
  text: string;
  type: "paragraph" | "list-item";
  sectionId: number;
  page?: number;
}

export interface DocumentSection {
  id: number;
  /** null for content that appears before the first heading. */
  heading: string | null;
  /** 1 = top level. */
  level: number;
  page?: number;
  paragraphIds: number[];
  tableIds: number[];
}

export interface DocumentTable {
  id: number;
  rows: string[][];
  hasHeader: boolean;
  sectionId: number;
  page?: number;
}

export interface DocumentMetadata {
  fileName: string;
  fileType: "pdf" | "docx";
  fileSize: number;
  /** Known for PDF. DOCX files do not store a reliable page count. */
  pageCount?: number;
  wordCount: number;
}

export interface ParsedDocument {
  title?: string;
  sections: DocumentSection[];
  paragraphs: DocumentParagraph[];
  tables: DocumentTable[];
  metadata: DocumentMetadata;
}

/** Progress callbacks a parser can report to. */
export interface ParseHooks {
  onStage: (stage: "extracting" | "reading", detail?: { page: number; totalPages: number }) => void;
  isCancelled: () => boolean;
}

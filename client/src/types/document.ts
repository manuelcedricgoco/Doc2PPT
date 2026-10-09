// Mirrors server/src/types/document.ts (the shape returned by POST /api/documents/extract).

export interface DocumentParagraph {
  id: number;
  text: string;
  type: "paragraph" | "list-item";
  sectionId: number;
  page?: number;
}

export interface DocumentSection {
  id: number;
  heading: string | null;
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

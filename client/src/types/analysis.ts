// Mirrors server/src/types/analysis.ts (returned by POST /api/documents/extract).

export type PresentationCategory = "academic" | "it" | "business" | "educational" | "marketing" | "general";

export type SectionRole =
  | "opening" | "abstract" | "overview" | "introduction" | "background" | "problem" | "objectives"
  | "literature" | "scope" | "significance" | "methodology" | "results" | "discussion" | "conclusion"
  | "recommendations" | "solution" | "features" | "architecture" | "techstack" | "implementation"
  | "testing" | "market" | "audience" | "businessmodel" | "competition" | "strategy" | "financial"
  | "channels" | "metrics" | "concepts" | "definition" | "examples" | "activity" | "assessment"
  | "summary" | "references" | "other";

export interface AnalyzedSection {
  id: number;
  heading: string | null;
  level: number;
  role: SectionRole;
  wordCount: number;
  paragraphCount: number;
  listItemCount: number;
  tableCount: number;
  density: "sparse" | "normal" | "dense";
  keywords: string[];
}

export interface CategoryScore {
  category: Exclude<PresentationCategory, "general">;
  score: number;
  matchedKeywords: string[];
}

export interface DocumentAnalysis {
  category: PresentationCategory;
  confidence: number;
  usedFallback: boolean;
  bestGuess?: Exclude<PresentationCategory, "general">;
  title?: string;
  sections: AnalyzedSection[];
  keywords: string[];
  scores: CategoryScore[];
  matchedKeywords: string[];
}

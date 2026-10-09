export type PresentationCategory = "academic" | "it" | "business" | "educational" | "marketing" | "general";

/** What a section is about, judged from its heading. Phase 4 maps these to slides. */
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
  /** 0 to 1. For the General fallback this is the confidence of the closest category. */
  confidence: number;
  /** True when no category reached the confidence threshold, so General was used. */
  usedFallback: boolean;
  /** The closest category when the fallback was used. */
  bestGuess?: Exclude<PresentationCategory, "general">;
  title?: string;
  sections: AnalyzedSection[];
  keywords: string[];
  scores: CategoryScore[];
  /** The terms that led to the chosen category (empty for General). */
  matchedKeywords: string[];
}

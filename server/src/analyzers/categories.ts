import type { PresentationCategory } from "../types/analysis.js";

type Term = string | { t: string; weak: true };
export type ScoredCategory = Exclude<PresentationCategory, "general">;

/**
 * Keywords per category. "weak" terms (like "introduction" or "system") show up in
 * almost every kind of document, so they count for much less than distinctive ones.
 */
const DEFINITIONS: Record<ScoredCategory, Term[]> = {
  academic: [
    "background of the study", "statement of the problem", "research questions", "research question",
    "scope and delimitations", "related literature", "review of related literature", "related studies",
    "significance of the study", "theoretical framework", "conceptual framework", "methodology",
    "research design", "respondents", "participants", "sampling", "hypothesis", "data analysis",
    "statistical", "significant relationship", "findings", "abstract", "this study", "the study",
    { t: "introduction", weak: true }, { t: "objectives", weak: true }, { t: "results", weak: true },
    { t: "discussion", weak: true }, { t: "conclusion", weak: true }, { t: "recommendations", weak: true },
  ],
  it: [
    "software", "mobile app", "web application", "database", "architecture", "technology stack",
    "tech stack", "backend", "frontend", "api", "server", "user interface", "requirements",
    "deployment", "framework", "source code", "programming", "algorithm", "network", "cloud",
    { t: "system", weak: true }, { t: "application", weak: true }, { t: "features", weak: true },
    { t: "development", weak: true }, { t: "testing", weak: true }, { t: "implementation", weak: true },
  ],
  business: [
    "business", "market", "customers", "revenue", "competitors", "executive summary", "target market",
    "business model", "profit", "financial", "sales", "pricing", "stakeholders", "competitive advantage",
    "investment", "investors", "company",
    { t: "product", weak: true }, { t: "service", weak: true }, { t: "marketing", weak: true },
    { t: "strategy", weak: true },
  ],
  educational: [
    "lesson", "learning objectives", "key concepts", "definition", "students", "teacher", "classroom",
    "quiz", "exercise", "lecture", "curriculum", "learners", "aralin", "layunin", "pagsusulit",
    "pagtataya", "gawain", "halimbawa", "kahulugan", "mag-aaral", "guro",
    { t: "examples", weak: true }, { t: "activities", weak: true }, { t: "assessment", weak: true },
    { t: "summary", weak: true },
  ],
  marketing: [
    "brand", "campaign", "audience", "target audience", "promotion", "social media", "engagement",
    "advertising", "content calendar", "influencer", "conversion", "impressions", "reach", "followers",
    "brand awareness", "hashtag",
    { t: "marketing", weak: true }, { t: "customer", weak: true }, { t: "strategy", weak: true },
    { t: "content", weak: true },
  ],
};

export interface CompiledTerm {
  term: string;
  weak: boolean;
  regex: RegExp;
}

function compile(term: string): RegExp {
  const body = term
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  // Whole word or phrase, allowing a plural ending.
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:s|es)?(?![\\p{L}\\p{N}])`, "giu");
}

export const COMPILED: Record<ScoredCategory, CompiledTerm[]> = Object.fromEntries(
  (Object.keys(DEFINITIONS) as ScoredCategory[]).map((cat) => [
    cat,
    DEFINITIONS[cat].map((t) => {
      const term = typeof t === "string" ? t : t.t;
      return { term, weak: typeof t !== "string", regex: compile(term) };
    }),
  ]),
) as Record<ScoredCategory, CompiledTerm[]>;

export const CATEGORY_IDS = Object.keys(DEFINITIONS) as ScoredCategory[];

// Tuning for the confidence rule.
export const MIN_TOP_SCORE = 6;
export const MIN_MATCHED_TERMS = 3;
export const CONFIDENCE_THRESHOLD = 0.4;

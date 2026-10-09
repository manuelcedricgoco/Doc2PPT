import type { PresentationCategory, SectionRole } from "../types/analysis";
import type { PresentationType } from "../types";

export const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  academic: "Academic / Research",
  it: "IT / Technology",
  business: "Business",
  educational: "Educational",
  marketing: "Marketing",
  general: "General",
};

/** The matching option in the Presentation type menu. */
export const CATEGORY_TO_TYPE: Record<PresentationCategory, PresentationType> = {
  academic: "Academic",
  it: "IT / Technology",
  business: "Business",
  educational: "Educational",
  marketing: "Marketing",
  general: "General",
};

export const ROLE_LABELS: Record<SectionRole, string> = {
  opening: "Opening text", abstract: "Abstract", overview: "Overview", introduction: "Introduction",
  background: "Background", problem: "Problem", objectives: "Objectives", literature: "Literature",
  scope: "Scope", significance: "Significance", methodology: "Methodology", results: "Results",
  discussion: "Discussion", conclusion: "Conclusion", recommendations: "Recommendations",
  solution: "Solution", features: "Features", architecture: "Architecture", techstack: "Tech stack",
  implementation: "Implementation", testing: "Testing", market: "Market", audience: "Audience",
  businessmodel: "Business model", competition: "Competition", strategy: "Strategy",
  financial: "Financial", channels: "Channels", metrics: "Metrics", concepts: "Key concepts",
  definition: "Definition", examples: "Examples", activity: "Activity", assessment: "Assessment",
  summary: "Summary", references: "References", other: "Other",
};

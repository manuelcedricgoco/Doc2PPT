import type { PresentationCategory, SectionRole } from "../types/analysis";
import type { PresentationType } from "../types";

export interface Slot {
  id: string;
  /** Standard slide name, used unless the document has its own heading for it. */
  title: string;
  /** Section roles (from document analysis) that belong on this slide. */
  roles: SectionRole[];
  /** Important slides are the last to be merged when a short length is chosen. */
  important?: boolean;
}

export interface Template {
  /** Slot that receives text appearing before the first heading. */
  openingSlot: string;
  /** Slides after the title slide, in presentation order. */
  slots: Slot[];
}

export const TYPE_TO_CATEGORY: Record<Exclude<PresentationType, "Auto Detect">, PresentationCategory> = {
  Academic: "academic",
  "IT / Technology": "it",
  Business: "business",
  Educational: "educational",
  Marketing: "marketing",
  General: "general",
};

export const TEMPLATES: Record<PresentationCategory, Template> = {
  academic: {
    openingSlot: "introduction",
    slots: [
      { id: "introduction", title: "Introduction", roles: ["introduction", "abstract", "overview"] },
      { id: "background", title: "Background", roles: ["background"] },
      { id: "problem", title: "Statement of the Problem", roles: ["problem"], important: true },
      { id: "objectives", title: "Objectives", roles: ["objectives"], important: true },
      { id: "scope", title: "Scope and Delimitations", roles: ["scope"] },
      { id: "significance", title: "Significance of the Study", roles: ["significance"] },
      { id: "literature", title: "Related Literature", roles: ["literature", "concepts", "definition"] },
      { id: "methodology", title: "Methodology", roles: ["methodology"], important: true },
      { id: "results", title: "Results and Findings", roles: ["results"], important: true },
      { id: "discussion", title: "Discussion", roles: ["discussion"] },
      { id: "conclusion", title: "Conclusion", roles: ["conclusion", "summary"], important: true },
      { id: "recommendations", title: "Recommendations", roles: ["recommendations"], important: true },
    ],
  },
  it: {
    openingSlot: "overview",
    slots: [
      { id: "overview", title: "Project Overview", roles: ["overview", "introduction", "abstract", "background"] },
      { id: "problem", title: "Problem", roles: ["problem"], important: true },
      { id: "solution", title: "Proposed Solution", roles: ["solution"], important: true },
      { id: "objectives", title: "Objectives", roles: ["objectives"], important: true },
      { id: "features", title: "Features", roles: ["features"], important: true },
      { id: "architecture", title: "System Architecture", roles: ["architecture"], important: true },
      { id: "techstack", title: "Technology Stack", roles: ["techstack"] },
      { id: "implementation", title: "Implementation", roles: ["implementation", "methodology"] },
      { id: "testing", title: "Testing", roles: ["testing"] },
      { id: "results", title: "Results", roles: ["results", "discussion"] },
      { id: "conclusion", title: "Conclusion", roles: ["conclusion", "summary"], important: true },
    ],
  },
  business: {
    openingSlot: "summary",
    slots: [
      { id: "summary", title: "Executive Summary", roles: ["overview", "abstract", "introduction"], important: true },
      { id: "problem", title: "Problem / Opportunity", roles: ["problem", "background"] },
      { id: "solution", title: "Solution", roles: ["solution"], important: true },
      { id: "market", title: "Target Market", roles: ["market", "audience"], important: true },
      { id: "product", title: "Product / Service", roles: ["features"] },
      { id: "model", title: "Business Model", roles: ["businessmodel"], important: true },
      { id: "competition", title: "Competitive Advantage", roles: ["competition"] },
      { id: "strategy", title: "Marketing Strategy", roles: ["strategy", "channels"] },
      { id: "financial", title: "Financial Overview", roles: ["financial", "metrics", "results"], important: true },
      { id: "conclusion", title: "Conclusion", roles: ["conclusion", "summary"], important: true },
    ],
  },
  educational: {
    openingSlot: "introduction",
    slots: [
      { id: "objectives", title: "Learning Objectives", roles: ["objectives"], important: true },
      { id: "introduction", title: "Introduction", roles: ["introduction", "overview", "background", "abstract"] },
      { id: "concepts", title: "Key Concepts", roles: ["concepts", "definition"], important: true },
      { id: "explanation", title: "Explanation", roles: ["discussion", "methodology"] },
      { id: "examples", title: "Examples", roles: ["examples"], important: true },
      { id: "activity", title: "Activity", roles: ["activity"] },
      { id: "assessment", title: "Assessment", roles: ["assessment"], important: true },
      { id: "summary", title: "Summary", roles: ["summary", "conclusion"], important: true },
    ],
  },
  marketing: {
    openingSlot: "overview",
    slots: [
      { id: "overview", title: "Campaign Overview", roles: ["overview", "introduction", "abstract", "background"], important: true },
      { id: "audience", title: "Target Audience", roles: ["audience", "market"], important: true },
      { id: "problem", title: "Market Problem", roles: ["problem"] },
      { id: "strategy", title: "Strategy", roles: ["strategy"], important: true },
      { id: "content", title: "Content / Campaign", roles: ["features", "solution"] },
      { id: "channels", title: "Channels", roles: ["channels"] },
      { id: "metrics", title: "Metrics", roles: ["metrics"] },
      { id: "results", title: "Expected Results", roles: ["results", "financial"], important: true },
      { id: "conclusion", title: "Conclusion", roles: ["conclusion", "summary"], important: true },
    ],
  },
  general: {
    openingSlot: "overview",
    slots: [
      { id: "overview", title: "Overview", roles: ["overview", "abstract", "introduction"] },
      { id: "background", title: "Background", roles: ["background"] },
      { id: "discussion", title: "Discussion", roles: ["discussion"] },
      { id: "summary", title: "Summary", roles: ["summary"], important: true },
      { id: "conclusion", title: "Conclusion", roles: ["conclusion", "recommendations"], important: true },
    ],
  },
};

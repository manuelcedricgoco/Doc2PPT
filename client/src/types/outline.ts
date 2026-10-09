import type { PresentationCategory, SectionRole } from "./analysis";
import type { PresentationLength } from "./index";

/** One planned slide. It points at the exact source paragraphs and tables it will be built from. */
export interface PlannedSlide {
  id: string;
  number: number;
  kind: "title" | "content";
  title: string;
  /** "template" = a standard slide name, "document" = taken from the document's own heading. */
  titleSource: "template" | "document";
  slotId?: string;
  role?: SectionRole;
  sourceSectionIds: number[];
  paragraphIds: number[];
  tableIds: number[];
  sourceWords: number;
}

export interface SkippedSection {
  sectionId: number;
  heading: string | null;
  reason: string;
}

export interface SlideOutline {
  category: PresentationCategory;
  length: PresentationLength;
  /** Slide count the chosen length aims for. */
  range: { min: number; max: number };
  slides: PlannedSlide[];
  skipped: SkippedSection[];
  notes: string[];
}

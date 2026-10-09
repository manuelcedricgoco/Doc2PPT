export const PRESENTATION_TYPES = [
  "Auto Detect",
  "Academic",
  "IT / Technology",
  "Business",
  "Educational",
  "Marketing",
  "General",
] as const;

export const VISUAL_STYLES = [
  "Modern",
  "Minimal",
  "Professional",
  "Academic",
  "Dark",
  "Corporate",
] as const;

export const PRESENTATION_LENGTHS = [
  { value: "short", label: "Short", hint: "5 to 7 slides" },
  { value: "standard", label: "Standard", hint: "8 to 12 slides" },
  { value: "detailed", label: "Detailed", hint: "12 to 20 slides" },
] as const;

export type PresentationType = (typeof PRESENTATION_TYPES)[number];
export type VisualStyle = (typeof VISUAL_STYLES)[number];
export type PresentationLength = (typeof PRESENTATION_LENGTHS)[number]["value"];

import type { PresentationCategory } from "../types/analysis";
import type { VisualStyle } from "../types";

export interface PresentationTheme {
  name: string;
  background: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  accent: string;
  soft: string;
  line: string;
  inverse: string;
  /** Fonts that ship with PowerPoint, WPS and Keynote. Web fonts are not installed on most computers. */
  headFont: string;
  bodyFont: string;
  /** Dark background used by the title slide and highlight slides, with colors that read well on it. */
  heroBg: string;
  heroInk: string;
  heroMuted: string;
  heroPanel: string;
  /** Text colors that stay readable on top of the primary and accent fills. */
  onPrimary: string;
  onAccent: string;
  dark: boolean;
}

type BaseTheme = Omit<PresentationTheme, "name" | "headFont" | "bodyFont" | "heroBg" | "heroInk" | "heroMuted" | "heroPanel" | "onPrimary" | "onAccent" | "dark">;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Blends two colors. amount 0 returns a, 1 returns b. */
export function mix(a: string, b: string, amount: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * amount) as [number, number, number]);
}

function luminance(hex: string): number {
  const lin = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** White or near-black, whichever is easier to read on this background. */
function readableOn(background: string, ink: string): string {
  return luminance(background) > 0.4 ? ink : "FFFFFF";
}

const CATEGORY_THEMES: Record<PresentationCategory, BaseTheme> = {
  academic: {
    background: "F6F7FA",
    surface: "FFFFFF",
    ink: "162033",
    muted: "5A6578",
    primary: "1D4ED8",
    accent: "C28A1A",
    soft: "EAF0FF",
    line: "DCE4F3",
    inverse: "FFFFFF",
  },
  it: {
    background: "F3F8FB",
    surface: "FFFFFF",
    ink: "102033",
    muted: "52677A",
    primary: "0F766E",
    accent: "7C3AED",
    soft: "E6F7F7",
    line: "D9E7EC",
    inverse: "FFFFFF",
  },
  business: {
    background: "F7F5F2",
    surface: "FFFFFF",
    ink: "17212B",
    muted: "5B6570",
    primary: "1F5A46",
    accent: "D97706",
    soft: "ECF8F3",
    line: "DDE7DF",
    inverse: "FFFFFF",
  },
  educational: {
    background: "F8F9F4",
    surface: "FFFFFF",
    ink: "1D2530",
    muted: "5A6472",
    primary: "2563EB",
    accent: "C75C2D",
    soft: "EAF2FF",
    line: "DEE7D8",
    inverse: "FFFFFF",
  },
  marketing: {
    background: "FBF6F8",
    surface: "FFFFFF",
    ink: "241C2D",
    muted: "635B6B",
    primary: "B42375",
    accent: "F59E0B",
    soft: "FCE7F3",
    line: "EADAE7",
    inverse: "FFFFFF",
  },
  general: {
    background: "F5F7FB",
    surface: "FFFFFF",
    ink: "151B2E",
    muted: "566074",
    primary: "3347C7",
    accent: "0F8A74",
    soft: "EBF0FF",
    line: "DDE5F4",
    inverse: "FFFFFF",
  },
};

const STYLE_OVERRIDES: Partial<Record<VisualStyle, Partial<BaseTheme>>> = {
  Minimal: {
    background: "FFFFFF",
    surface: "FFFFFF",
    soft: "F2F4F7",
    line: "E4E7EC",
  },
  Professional: {
    background: "F4F6F8",
    primary: "1F3A5F",
    accent: "62748E",
    soft: "E7ECF2",
  },
  Academic: {
    background: "F7F7F3",
    primary: "233A66",
    accent: "8A6F1E",
    soft: "ECE8DA",
  },
  Dark: {
    background: "111827",
    surface: "1F2937",
    ink: "F9FAFB",
    muted: "CBD5E1",
    primary: "7DD3FC",
    accent: "FBBF24",
    soft: "243244",
    line: "334155",
    inverse: "111827",
  },
  Corporate: {
    background: "F5F7FA",
    primary: "183B56",
    accent: "2F80ED",
    soft: "E6EEF7",
    line: "D7DEE8",
  },
};

export function resolvePresentationTheme(category: PresentationCategory, style: VisualStyle): PresentationTheme {
  const base: BaseTheme = { ...CATEGORY_THEMES[category], ...(STYLE_OVERRIDES[style] ?? {}) };
  const dark = style === "Dark";
  const heroBg = dark ? "0B1220" : mix(base.primary, "000000", 0.5);
  const heroInk = "FFFFFF";

  return {
    name: style,
    ...base,
    headFont: style === "Academic" ? "Cambria" : "Calibri",
    bodyFont: "Calibri",
    heroBg,
    heroInk,
    heroMuted: mix(heroBg, "FFFFFF", 0.72),
    heroPanel: mix(heroBg, "FFFFFF", dark ? 0.09 : 0.12),
    onPrimary: readableOn(base.primary, base.ink),
    onAccent: readableOn(base.accent, base.ink),
    dark,
  };
}

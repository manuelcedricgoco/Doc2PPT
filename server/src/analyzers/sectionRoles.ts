import type { SectionRole } from "../types/analysis.js";

// First match wins, so more specific roles come first.
const RULES: [SectionRole, RegExp][] = [
  ["abstract", /\babstract\b/i],
  ["financial", /\b(financ\w*|budget|costs?|investment|projections?|funding|profit)\b/i],
  ["overview", /\b(overview|executive summary|project (description|summary)|about (the |our )?(project|system|company|app))\b/i],
  ["problem", /\b(statement of the problem|problem statement|research questions?|the problem|problems?\b|pain points?|challenges?)\b/i],
  ["objectives", /\b(objectives?|aims?|goals?|purpose of the study|learning outcomes|layunin)\b/i],
  ["significance", /\bsignificance of the study\b/i],
  ["scope", /\b(scope|delimitations?|limitations?)\b/i],
  ["literature", /\b(literature|related stud(y|ies)|theoretical|conceptual framework|review of)\b/i],
  ["background", /\b(background|context of the study|rationale|history)\b/i],
  ["methodology", /\b(method(s|ology)?|research design|procedures?|respondents|participants|data (collection|gathering|analysis)|sampling|instruments?)\b/i],
  ["discussion", /\b(discussion|interpretation|implications?)\b/i],
  ["results", /\b(results?|findings|presentation of data|outcomes?)\b/i],
  ["recommendations", /\b(recommendations?|suggestions|future (work|research|plans?))\b/i],
  ["conclusion", /\b(conclusions?|closing|final thoughts)\b/i],
  ["techstack", /\b(tech(nology)? stack|technologies|tools|technical (specifications?|requirements)|frameworks?)\b/i],
  ["architecture", /\b(architecture|system design|data ?flow|database (design|schema)|er diagram|erd)\b/i],
  ["features", /\b(features?|functionalit(y|ies)|modules?|capabilities)\b/i],
  ["solution", /\b(solution|proposed (system|solution)|our approach|product|service)\b/i],
  ["testing", /\b(testing|test (cases|results)|quality assurance|qa|evaluation|validation)\b/i],
  ["implementation", /\b(implementation|development|deployment|installation|set ?up)\b/i],
  ["audience", /\b(target audience|audience|personas?)\b/i],
  ["market", /\b(market|customers?|segments?)\b/i],
  ["businessmodel", /\b(business model|revenue|pricing|monetization)\b/i],
  ["competition", /\b(compet(itors?|ition|itive)|swot)\b/i],
  ["channels", /\b(channels?|platforms?|social media)\b/i],
  ["metrics", /\b(metrics|kpis?|performance indicators|analytics)\b/i],
  ["strategy", /\b(strateg(y|ies)|marketing plan|promotions?|go-to-market|campaign)\b/i],
  ["assessment", /\b(assessment|quiz|exam|review questions|pagtataya|pagsusulit)\b/i],
  ["activity", /\b(activit(y|ies)|exercises?|practice|gawain)\b/i],
  ["examples", /\b(examples?|illustrations?|case stud(y|ies)|halimbawa)\b/i],
  ["definition", /\b(definitions?|what is|kahulugan)\b/i],
  ["concepts", /\b(key concepts?|concepts?|terminology|definition of terms)\b/i],
  ["summary", /\b(summary|key takeaways|recap|buod)\b/i],
  ["references", /\b(references|bibliography|sources|works cited|appendi(x|ces))\b/i],
  ["introduction", /\b(introduction|panimula|getting started)\b/i],
];

/** Removes numbering like "1.2", "II." or "Chapter 3:" before matching. */
function stripNumbering(heading: string): string {
  return heading.replace(/^\s*(?:chapter|section|part|lesson|unit)?\s*(?:\d+(?:\.\d+)*|[IVXLC]+)[.):\-]?\s+/i, "").trim();
}

export function detectRole(heading: string | null): SectionRole {
  if (heading === null) return "opening";
  // A lesson or unit title ("Aralin 1: ...", "Lesson 2") names the lesson's content.
  if (/^\s*(aralin|lesson|unit|module)\s+\d+/i.test(heading)) return "concepts";
  const text = stripNumbering(heading);
  for (const [role, re] of RULES) if (re.test(text)) return role;
  return "other";
}

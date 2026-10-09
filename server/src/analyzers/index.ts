import type { ParsedDocument } from "../types/document.js";
import type { AnalyzedSection, CategoryScore, DocumentAnalysis } from "../types/analysis.js";
import { CATEGORY_IDS, COMPILED, CONFIDENCE_THRESHOLD, MIN_MATCHED_TERMS, MIN_TOP_SCORE } from "./categories.js";
import { extractKeywords } from "./keywords.js";
import { detectRole } from "./sectionRoles.js";
import { countWords } from "../utils/text.js";

const HEADING_WEIGHT = { strong: 3, weak: 1 };
const BODY_WEIGHT = { strong: 1, weak: 0.3 };
const BODY_CAP = { strong: 4, weak: 3 };

function countMatches(re: RegExp, text: string): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) n++;
  return n;
}

function scoreCategories(headings: string[], body: string): CategoryScore[] {
  return CATEGORY_IDS.map((category) => {
    let score = 0;
    const matched: { term: string; points: number }[] = [];
    for (const { term, weak, regex } of COMPILED[category]) {
      const kind = weak ? "weak" : "strong";
      const inHeadings = headings.filter((h) => countMatches(regex, h) > 0).length;
      const inBody = Math.min(countMatches(regex, body), BODY_CAP[kind]);
      const points = Math.min(inHeadings, 2) * HEADING_WEIGHT[kind] + inBody * BODY_WEIGHT[kind];
      if (points > 0) {
        score += points;
        matched.push({ term, points });
      }
    }
    matched.sort((a, b) => b.points - a.points);
    return { category, score: Math.round(score * 10) / 10, matchedKeywords: matched.map((m) => m.term) };
  }).sort((a, b) => b.score - a.score);
}

/** Smart document analysis: rule-based, runs locally, no AI. */
export function analyzeDocument(doc: ParsedDocument): DocumentAnalysis {
  const fileStem = doc.metadata.fileName.replace(/\.[^.]+$/, "");
  const realTitle = doc.title && doc.title !== fileStem ? doc.title : undefined; // title may fall back to the file name
  const headings = [realTitle, ...doc.sections.map((s) => s.heading)].filter((h): h is string => !!h);
  const tableText = doc.tables.map((t) => t.rows.map((r) => r.join(" ")).join(" "));
  const body = [...doc.paragraphs.map((p) => p.text), ...tableText].join("\n");

  const scores = scoreCategories(headings, body);
  const [top, second] = scores;
  const margin = top.score > 0 ? (top.score - (second?.score ?? 0)) / top.score : 0;
  const strength = top.score / (top.score + 10);
  // Thin evidence (a score far below the minimum) should never look confident.
  const evidence = Math.min(1, top.score / MIN_TOP_SCORE);
  const confidence = Math.round((0.5 * margin + 0.5 * strength) * evidence * 100) / 100;

  const reached =
    top.score >= MIN_TOP_SCORE && top.matchedKeywords.length >= MIN_MATCHED_TERMS && confidence >= CONFIDENCE_THRESHOLD;

  const sections: AnalyzedSection[] = doc.sections.map((s) => {
    const paras = s.paragraphIds.map((id) => doc.paragraphs[id]);
    const tables = s.tableIds.map((id) => doc.tables[id]);
    const wordCount =
      paras.reduce((n, p) => n + countWords(p.text), 0) +
      tables.reduce((n, t) => n + t.rows.reduce((m, r) => m + r.reduce((k, c) => k + countWords(c), 0), 0), 0);
    return {
      id: s.id,
      heading: s.heading,
      level: s.level,
      role: detectRole(s.heading),
      wordCount,
      paragraphCount: paras.filter((p) => p.type === "paragraph").length,
      listItemCount: paras.filter((p) => p.type === "list-item").length,
      tableCount: tables.length,
      density: wordCount < 40 ? "sparse" : wordCount > 250 ? "dense" : "normal",
      keywords: wordCount >= 25 ? extractKeywords(paras.map((p) => ({ text: p.text, weight: 1 })), 3) : [],
    };
  });

  const blocks = [
    ...doc.paragraphs.map((p) => ({ text: p.text, weight: 1 })),
    ...headings.map((h) => ({ text: h, weight: 1.5 })),
  ];
  const keywords = extractKeywords(blocks, 10, doc.metadata.wordCount < 300 ? 2 : 3);

  return {
    category: reached ? top.category : "general",
    confidence,
    usedFallback: !reached,
    bestGuess: reached || top.score < 3 ? undefined : top.category,
    title: doc.title,
    sections,
    keywords,
    scores,
    matchedKeywords: reached ? top.matchedKeywords.slice(0, 8) : [],
  };
}

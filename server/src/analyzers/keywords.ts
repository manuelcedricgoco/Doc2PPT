import { STOPWORDS } from "../utils/stopwords.js";

const TOKEN = /[\p{L}][\p{L}\p{N}'’-]*/gu;

/** Light plural folding so "student" and "students" count together. */
function fold(t: string): string {
  return t.length > 4 && t.endsWith("s") && !/(ss|us|is)$/.test(t) ? t.slice(0, -1) : t;
}

interface Block { text: string; weight: number }

/**
 * Finds repeated terminology: single words and two-word phrases ranked by how
 * often they appear. Heading text can be given extra weight. Nothing is invented:
 * every returned term appears in the source text.
 */
export function extractKeywords(blocks: Block[], limit: number, minCount = 2): string[] {
  const uni = new Map<string, { n: number; surface: Map<string, number> }>();
  const bi = new Map<string, { n: number; surface: string }>();

  for (const { text, weight } of blocks) {
    const tokens = text.toLowerCase().match(TOKEN) ?? [];
    let prev: string | null = null;
    for (const raw of tokens) {
      const word = raw.replace(/^['’-]+|['’-]+$/g, "");
      if (word.length < 3 || STOPWORDS.has(word)) {
        prev = null;
        continue;
      }
      const key = fold(word);
      const u = uni.get(key) ?? { n: 0, surface: new Map() };
      u.n += weight;
      u.surface.set(word, (u.surface.get(word) ?? 0) + 1);
      uni.set(key, u);
      if (prev) {
        const bkey = `${fold(prev)} ${key}`;
        const b = bi.get(bkey) ?? { n: 0, surface: `${prev} ${word}` };
        b.n += weight;
        bi.set(bkey, b);
      }
      prev = word;
    }
  }

  const surfaceOf = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const candidates = [
    ...[...uni.entries()].filter(([, v]) => v.n >= minCount).map(([k, v]) => ({ key: k, text: surfaceOf(v.surface), score: v.n, words: 1 })),
    ...[...bi.entries()].filter(([, v]) => v.n >= Math.max(2, minCount)).map(([k, v]) => ({ key: k, text: v.surface, score: v.n * 1.6, words: 2 })),
  ].sort((a, b) => b.score - a.score || b.words - a.words);

  const picked: typeof candidates = [];
  for (const c of candidates) {
    if (picked.length >= limit) break;
    if (c.words === 1) {
      // Skip a word already covered by a chosen phrase that is about as frequent.
      const covered = picked.some((p) => p.words === 2 && p.key.split(" ").includes(c.key) && p.score / 1.6 >= c.score * 0.6);
      if (covered) continue;
    }
    picked.push(c);
  }
  return picked.map((p) => p.text);
}

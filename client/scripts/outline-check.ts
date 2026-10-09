// Checks the slide outline generator against saved extraction results.
// Run:  npm run check:outline -w client
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSlideOutline, LENGTH_RANGES } from "../src/generators/slideOutline";
import type { DocumentAnalysis } from "../src/types/analysis";
import type { ParsedDocument } from "../src/types/document";
import type { PresentationLength, PresentationType } from "../src/types";

const dir = join(import.meta.dirname, "fixtures");
const lengths: PresentationLength[] = ["short", "standard", "detailed"];
const types: PresentationType[] = ["Auto Detect", "Academic", "IT / Technology", "Business", "Educational", "Marketing", "General"];
const verbose = process.argv.includes("--show");
let failures = 0;
const fail = (msg: string) => { failures++; console.log("  FAIL:", msg); };

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
if (files.length === 0) { console.log("No fixtures found in scripts/fixtures."); process.exit(1); }

for (const file of files) {
  const { document: doc, analysis } = JSON.parse(readFileSync(join(dir, file), "utf8")) as { document: ParsedDocument; analysis: DocumentAnalysis };
  const row: string[] = [];
  for (const type of types) {
    for (const length of lengths) {
      const o = buildSlideOutline(doc, analysis, { type, length });
      const label = `${file} [${type}/${length}]`;
      const range = LENGTH_RANGES[length];

      // 1. no empty slides, no empty titles
      o.slides.forEach((s) => {
        if (!s.title.trim()) fail(`${label}: empty title on slide ${s.number}`);
        if (s.kind === "content" && s.sourceWords === 0) fail(`${label}: slide ${s.number} "${s.title}" has no content`);
      });
      // 2. every paragraph and table appears on exactly one slide, except skipped sections
      const skippedIds = new Set(o.skipped.map((k) => k.sectionId));
      const seenP = new Map<number, number>();
      const seenT = new Map<number, number>();
      o.slides.forEach((s) => {
        s.paragraphIds.forEach((id) => seenP.set(id, (seenP.get(id) ?? 0) + 1));
        s.tableIds.forEach((id) => seenT.set(id, (seenT.get(id) ?? 0) + 1));
      });
      for (const p of doc.paragraphs) {
        if (skippedIds.has(p.sectionId)) continue;
        const n = seenP.get(p.id) ?? 0;
        if (n !== 1) fail(`${label}: paragraph ${p.id} used ${n} times`);
      }
      for (const t of doc.tables) {
        if (skippedIds.has(t.sectionId)) continue;
        const n = seenT.get(t.id) ?? 0;
        if (n !== 1) fail(`${label}: table ${t.id} used ${n} times`);
      }
      // 3. never above the max; below the min only with an explanation
      if (o.slides.length > range.max) fail(`${label}: ${o.slides.length} slides, max ${range.max}`);
      if (o.slides.length < range.min && !o.notes.some((n) => n.includes("limited content"))) fail(`${label}: ${o.slides.length} slides below min with no note`);
      // 4. slide numbers are sequential and the first slide is the title slide
      o.slides.forEach((s, i) => { if (s.number !== i + 1) fail(`${label}: bad numbering`); });
      if (o.slides[0].kind !== "title") fail(`${label}: first slide is not the title slide`);
      if (type === "Auto Detect") row.push(`${length[0].toUpperCase()}=${o.slides.length}`);
    }
  }
  const auto = buildSlideOutline(doc, analysis, { type: "Auto Detect", length: "standard" });
  console.log(`${file.padEnd(32)} ${auto.category.padEnd(11)} ${row.join("  ")}`);
  if (verbose) {
    for (const s of auto.slides) console.log(`    ${String(s.number).padStart(2)}. ${s.title}${s.titleSource === "document" ? "  (doc heading)" : ""}  [${s.sourceWords}w]`);
    auto.notes.forEach((n) => console.log("    note:", n));
    auto.skipped.forEach((k) => console.log("    skipped:", k.heading));
  }
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

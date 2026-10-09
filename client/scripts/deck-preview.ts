// Builds sample .pptx files from the saved extraction fixtures so you can open them and check the design.
// Run:  npm run preview:deck -w client
//       npm run preview:deck -w client -- rizal Professional General standard
//         (arguments: part of a fixture name, visual style, presentation type, length)
// Files are written to client/scripts/out/
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSlideOutline } from "../src/generators/slideOutline";
import { buildGeneratedPresentation } from "../src/generators/generatedPresentation";
import { buildPresentation } from "../src/generators/pptx";
import type { DocumentAnalysis } from "../src/types/analysis";
import type { ParsedDocument } from "../src/types/document";
import type { PresentationLength, PresentationType, VisualStyle } from "../src/types";

const [filter = "", style = "Modern", type = "Auto Detect", length = "standard"] = process.argv.slice(2);
const dir = join(import.meta.dirname, "fixtures");
const out = join(import.meta.dirname, "out");
mkdirSync(out, { recursive: true });

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f.includes(filter)).sort();
if (!files.length) {
  console.log(`No fixture matches "${filter}".`);
  process.exit(1);
}

for (const file of files) {
  const { document: doc, analysis } = JSON.parse(readFileSync(join(dir, file), "utf8")) as { document: ParsedDocument; analysis: DocumentAnalysis };
  const outline = buildSlideOutline(doc, analysis, { type: type as PresentationType, length: length as PresentationLength });
  const generated = buildGeneratedPresentation(doc, outline, style as VisualStyle);
  const fileName = join(out, `${file.replace(/\.json$/, "")}-${style}.pptx`);
  await buildPresentation(generated).writeFile({ fileName, compression: true });
  console.log(`${fileName}  (${generated.slides.length} slides)`);
}

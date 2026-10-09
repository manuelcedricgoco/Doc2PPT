# Doc2PPT

Turn PDF and DOCX documents into structured PowerPoint presentations with a presenter script.

> Doc2PPT does not use Claude API, OpenAI API, Gemini API, or another paid AI API.

**Status: Phase 10 of 10 — complete release build.**
Upload, extraction, analysis, slide structure, PPTX generation, presenter scripts, slide preview/editing and the free-generation limit are all in place. The app is ready for local use without any paid AI API or login.

## Architecture

- **No login.** No accounts, email, passwords or OAuth.
- **No paid AI.** Analysis and generation use local, rule-based logic (keywords, regex, headings, templates).
- **Client:** React, Vite, TypeScript, Tailwind CSS v4. **Server:** Node.js, Express 5, TypeScript.
- The frontend calls the backend through `/api` (Vite proxies it to port 3001 in development).
- The free-generation limit will use localStorage (Phase 8). It is not tamper-proof, by design.

## Supported files and extraction (Phase 2)

- **PDF and DOCX**, up to 20 MB. Checked by extension, MIME type, size and the file's real signature.
- Extracted: title, headings (with levels), paragraphs, list items, tables, and page numbers (PDF).
- PDFs: headings come from font size and numbered/ALL-CAPS lines; running headers, footers and page numbers are removed.
- DOCX: Word heading styles are used; without them, bold/numbered/ALL-CAPS short lines are treated as headings.
- Limits: 300 PDF pages, 150,000 words. Password-protected PDFs, scanned (image-only) PDFs and damaged files get a clear message.
- Uploads are held in memory only. Nothing is written to disk or logged.
- API: `POST /api/documents/extract` (multipart field `file`). Responds with JSON lines: stage events, then `done` with the document or `error`.

## Smart document analysis (Phase 3)

Runs on the server right after extraction. It is rule-based (keywords, heading patterns, word statistics) and does not use AI.

- **Topic detection:** Academic / Research, IT / Technology, Business, Educational, Marketing, or General.
  Each category has keyword lists (English, plus some Filipino terms for Educational). A match in a heading counts more than a match
  in the body, and generic words like "system" or "summary" count less than distinctive ones like "methodology" or "campaign".
- **Confidence:** 0 to 1, from how far the top category leads and how much evidence it has. If no category reaches the threshold,
  the General structure is used and the closest category is shown as a hint.
- **Section roles:** each heading is labelled (Introduction, Methodology, Features, Target market, Assessment, ...) for the slide structure in Phase 4.
- **Key terms:** repeated words and two-word phrases taken from the document. Nothing is added that is not in the source.
- Tuning lives in `server/src/analyzers/categories.ts` (keywords, thresholds) and `sectionRoles.ts` (heading rules).
- If you choose a Presentation type yourself, your choice overrides the detected one.

## Automatic slide structure (Phase 4)

Runs in the browser (`client/src/generators`), so changing the type or length re-plans instantly without re-uploading.

- **Templates** per category are in `generators/templates.ts` (Academic, IT, Business, Educational, Marketing, General).
  Each document section is matched to a template slide using its role from the analysis step.
- **Adapts to the document:** a slide exists only if the document has content for it. Sections that fit no template slide get a slide
  of their own, titled with the document's heading, placed where they appear in the document. Subsections stay with their parent.
  References and appendices are listed as "not included".
- **Length:** Short 5 to 7, Standard 8 to 12, Detailed 12 to 20 slides. Too many slides: the smallest neighbouring sections are
  combined (important ones last). Too few: long slides are split by section, then at paragraph breaks. Small documents are never padded;
  a note explains when fewer slides are planned.
- **Faithful by design:** each planned slide lists the exact source paragraphs and tables it will use. Every paragraph and table is
  used exactly once, so nothing is lost or invented. Slide text is written in Phase 5.
- **Check script:** `npm run check:outline -w client` runs the generator over saved results in `client/scripts/fixtures`
  for every type and length, and verifies: no empty slides, no source text lost or duplicated, slide counts within range.
  Add `-- --show` to print the outlines.
- Standard slide names (like "Key Concepts") are in English, even for Filipino documents. Document headings are kept as written.

## PowerPoint generation (Phase 5)

Runs in the browser after extraction and outline planning. No document content is sent to an external presentation or AI service.

- Uses **PptxGenJS** to create a real `.pptx` file from the current slide outline.
- Supports presentation type, visual style and length selections. Presentation type controls the slide structure; visual style controls the theme.
- Visual styles: Modern, Minimal, Professional, Academic, Dark and Corporate.
- Category-aware themes: Academic, IT / Technology, Business, Educational, Marketing and General use different palettes and layouts.
- Slide text is extracted from the mapped source paragraphs and list items. It is shortened into concise bullets; the app does not invent claims, statistics or citations.
- Tables are included when the source document has usable table data.
- The PPTX writer is lazy-loaded only when the user clicks Generate Presentation, keeping the initial app bundle smaller.
- Speaker notes and presenter scripts are added in Phase 6.

## Known limitations

- Topic detection works best on documents with headings and at least a few hundred words. Very short or unusual documents fall back to General.
- Keyword lists cover English and some Filipino terms only.

- Multi-column PDFs can read across columns.
- Scanned PDFs need OCR, which is not included.
- DOCX has no reliable page count, so pages are not shown for DOCX.
- Tables in PDFs are detected from column alignment and may miss unusual layouts.

## Requirements

Node.js 20 or newer (check with `node -v`).

## Install and run (Windows, PowerShell or Command Prompt)

```
npm install
npm run dev
```

- App: http://localhost:5173
- API health check: http://localhost:3001/api/health  ->  `{"status":"ok"}`

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs client and server dependencies (npm workspaces) |
| `npm run dev` | Starts server and client together |
| `npm run build` | Builds server (`server/dist`) and client (`client/dist`) |
| `npm run start` | Runs the built server |

## Project structure

```
doc2ppt/
  client/src/   components, pages, layouts, services, generators, analyzers, parsers, utils, types, hooks, assets
  server/src/   routes, parsers, analyzers, generators, services, utils, server.ts
  package.json  npm workspaces + dev/build scripts
```

## Settings

`client/src/utils/config.ts` holds `GENERATION_LIMIT` (5), `RESET_DURATION_HOURS` (24, or 5), the 20 MB file limit
and `CURRENT_PHASE`. Raise `CURRENT_PHASE` as phases ship; the "Coming in Phase N" badges disappear on their own.

## Dependencies (all free and open source; none need an API key or send data anywhere)

- client: react, react-dom, lucide-react (icons), pptxgenjs (PPTX generation), @fontsource-variable/bricolage-grotesque and
  @fontsource-variable/figtree (fonts bundled locally, no Google Fonts requests), vite, @vitejs/plugin-react,
  tailwindcss, @tailwindcss/vite, typescript
- server: express, multer (uploads), pdfjs-dist (PDF text), mammoth (DOCX), node-html-parser, tsx, typescript, @types/node, @types/express, @types/multer
- root: concurrently (runs server and client together)

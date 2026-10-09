import { Router, type Response } from "express";
import multer from "multer";
import { MAX_FILE_SIZE_BYTES } from "../config.js";
import { analyzeDocument } from "../analyzers/index.js";
import { parseDocument } from "../parsers/index.js";
import { validateUpload } from "../services/validateUpload.js";
import { AppError } from "../utils/AppError.js";

export const documentsRouter = Router();

// Uploads are held in memory only. Nothing is written to disk, so there is
// no temporary file to clean up and nothing left behind after the response.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 0 },
}).single("file");

function sendError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  return res.status(500).json({
    error: { code: "EXTRACTION_FAILED", message: "Something went wrong while reading this document. Please try another PDF or DOCX file." },
  });
}

/**
 * POST /api/documents/extract  (multipart, field "file")
 * Validation problems return a normal JSON error. Once reading starts, the
 * response is a stream of JSON lines so the browser can show real progress:
 *   {"type":"stage","stage":"extracting","page":3,"totalPages":12}
 *   {"type":"stage","stage":"reading"}
 *   {"type":"stage","stage":"analyzing"}
 *   {"type":"done","document":{...},"analysis":{...}}   or   {"type":"error","code":"...","message":"..."}
 */
documentsRouter.post("/documents/extract", (req, res) => {
  upload(req, res, async (uploadErr) => {
    if (uploadErr) {
      if (uploadErr instanceof multer.MulterError && uploadErr.code === "LIMIT_FILE_SIZE") {
        return sendError(res, new AppError("FILE_TOO_LARGE", "That file is larger than 20 MB. Choose a smaller PDF or DOCX.", 413));
      }
      return sendError(res, new AppError("NO_FILE", "Choose a PDF or DOCX file to upload.", 400));
    }
    const file = req.file;
    if (!file) return sendError(res, new AppError("NO_FILE", "Choose a PDF or DOCX file to upload.", 400));

    let kind;
    try {
      kind = validateUpload(file);
    } catch (err) {
      return sendError(res, err);
    }

    res.status(200).set({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    let cancelled = false;
    res.on("close", () => {
      if (!res.writableFinished) cancelled = true;
    });
    const send = (event: object) => {
      if (!cancelled) res.write(JSON.stringify(event) + "\n");
    };

    try {
      const document = await parseDocument(file, kind, {
        isCancelled: () => cancelled,
        onStage: (stage, detail) => send({ type: "stage", stage, ...detail }),
      });
      send({ type: "stage", stage: "analyzing" });
      const analysis = analyzeDocument(document);
      send({ type: "done", document, analysis });
    } catch (err) {
      if (!(err instanceof AppError) && (err as Error)?.message !== "cancelled") {
        // Log the failure type only, never document content.
        console.error("Extraction failed:", (err as Error)?.name, (err as Error)?.message?.slice(0, 200));
      }
      if (err instanceof AppError) send({ type: "error", code: err.code, message: err.message });
      else if ((err as Error)?.message !== "cancelled") {
        send({ type: "error", code: "EXTRACTION_FAILED", message: "Something went wrong while reading this document. Please try another PDF or DOCX file." });
      }
    } finally {
      res.end();
    }
  });
});

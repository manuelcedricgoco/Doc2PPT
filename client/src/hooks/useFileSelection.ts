import { useCallback, useState } from "react";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "../utils/config";

// Picks a file and does a quick name and size check for an instant response.
// The server repeats these checks and also verifies the file's real contents.
export function useFileSelection() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback((candidate: File | undefined) => {
    if (!candidate) return;
    const dot = candidate.name.lastIndexOf(".");
    const ext = dot >= 0 ? candidate.name.slice(dot).toLowerCase() : "";

    if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
      setError("Doc2PPT supports PDF and DOCX files only. Choose a .pdf or .docx file.");
      return;
    }
    if (candidate.size === 0) {
      setError("That file is empty. Choose a PDF or DOCX that has content.");
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setError(`That file is larger than ${MAX_FILE_SIZE_MB} MB. Choose a smaller PDF or DOCX.`);
      return;
    }
    setError(null);
    setFile(candidate);
  }, []);

  const clear = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return { file, error, select, clear };
}

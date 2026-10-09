import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { MAX_FILE_SIZE_MB } from "../utils/config";

type Props = { onSelect: (file: File | undefined) => void };

export function UploadDropzone({ onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const openPicker = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload a PDF or DOCX document, up to ${MAX_FILE_SIZE_MB} MB`}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onSelect(e.dataTransfer.files?.[0]);
      }}
      className={`flex cursor-pointer flex-col items-center rounded-[14px] border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragging ? "border-brand bg-brand-soft" : "border-line bg-paper hover:border-brand/60"
      }`}
    >
      <UploadCloud size={32} className="text-brand" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold">Drop a document here, or choose a file</p>
      <p className="mt-1 text-sm text-muted">PDF or DOCX, up to {MAX_FILE_SIZE_MB} MB</p>
      <input
        ref={inputRef}
        type="file"
        tabIndex={-1}
        className="sr-only"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => {
          onSelect(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

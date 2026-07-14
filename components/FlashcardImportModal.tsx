"use client";
import { useState, useRef, useCallback } from "react";
import { X, Upload, FileText, AlertCircle } from "lucide-react";
import {
  importFlashcardSet,
  parseFlashcardImport,
  type ImportResult,
} from "@/lib/flashcards-storage";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function FlashcardImportModal({ onClose, onImported }: Props) {
  const [text, setText] = useState(
    "# name: Từ vựng chuyên ngành IT\n# description: Bộ từ vựng ví dụ (3 thẻ)\nprotocol,giao thức\nserver,máy chủ,DNS server handles domain resolution\nfirewall,tường lửa\n",
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setError(null);
    };
    reader.onerror = () => setError("Không đọc được file");
    reader.readAsText(file);
  }, []);

  const handleSubmit = useCallback(() => {
    setError(null);
    const result: ImportResult = parseFlashcardImport(text, fileName || "import.txt");
    if (!result.ok || !result.set) {
      setError(result.message);
      return;
    }
    importFlashcardSet(result.set);
    onImported();
    onClose();
  }, [text, fileName, onImported, onClose]);

  return (
    <div className="fc-import-modal-bg" onClick={onClose}>
      <div className="fc-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="fc-import-title">Import bộ thẻ mới</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="fc-btn fc-btn-ghost"
            style={{ padding: "6px", width: 32, height: 32 }}
          >
            <X size={15} />
          </button>
        </div>

        <p className="fc-import-help">
          Mỗi dòng là một thẻ theo định dạng:{" "}
          <code>front,back,example</code> (cột <code>example</code> không bắt buộc). Dòng bắt đầu bằng
          <code> #</code> là comment. Dùng <code># name:</code> và <code># description:</code> để đặt tên set.
        </p>

        <div className="fc-import-file">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <button
            type="button"
            className="fc-import-file-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={13} />
            Chọn file .csv / .txt
          </button>
          {fileName && (
            <span className="flex items-center gap-1.5">
              <FileText size={13} />
              {fileName}
            </span>
          )}
        </div>

        <textarea
          className="fc-import-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          aria-label="Nội dung CSV / TXT"
        />

        {error && (
          <div className="fc-import-error flex items-start gap-2">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="fc-import-actions">
          <button type="button" className="fc-btn fc-btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button
            type="button"
            className="fc-btn fc-btn-primary"
            onClick={handleSubmit}
          >
            <Upload size={13} />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

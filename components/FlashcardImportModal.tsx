"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, FileText, AlertCircle } from "lucide-react";
import {
  importFlashcardSet,
  parseFlashcardImport,
  type ImportResult,
} from "@/lib/flashcards-storage";
import { playSfx } from "@/lib/sound";

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function FlashcardImportModal({ onClose, onImported }: Props) {
  // Start with an *empty* example so users don't accidentally import 3
  // sample cards. Provide a hint placeholder instead.
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPrefill, setConfirmPrefill] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setError(null);
      playSfx("complete");
    };
    reader.onerror = () => {
      setError("Không đọc được file");
      playSfx("wrong");
    };
    reader.readAsText(file);
  }, []);

  const handleSubmit = useCallback(() => {
    setError(null);
    const result: ImportResult = parseFlashcardImport(text, fileName || "import.txt");
    if (!result.ok || !result.set) {
      setError(result.message);
      playSfx("wrong");
      return;
    }
    importFlashcardSet(result.set);
    playSfx("complete");
    onImported();
    onClose();
  }, [text, fileName, onImported, onClose]);

  const handleClose = () => {
    playSfx("click");
    onClose();
  };

  // Escape closes the modal so keyboard users aren't trapped.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fc-import-modal-bg" onClick={handleClose}>
      <div className="fc-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="fc-import-title">Import bộ thẻ mới</h2>
          <button
            type="button"
            onClick={handleClose}
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
            id="fc-import-file-input"
            accept=".csv,.txt,.tsv,text/csv,text/plain"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <label
            htmlFor="fc-import-file-input"
            className="fc-import-file-btn"
          >
            <Upload size={13} aria-hidden="true" />
            Chọn file .csv / .txt
          </label>
          {fileName && (
            <span className="flex items-center gap-1.5">
              <FileText size={13} aria-hidden="true" />
              {fileName}
            </span>
          )}
          <button
            type="button"
            className="fc-btn fc-btn-ghost"
            style={{ marginLeft: "auto", fontSize: 11 }}
            onClick={() => {
              setText("# name: Từ vựng chuyên ngành IT\n# description: Bộ từ vựng ví dụ (3 thẻ)\nprotocol,giao thức\nserver,máy chủ,DNS server handles domain resolution\nfirewall,tường lửa\n");
              setConfirmPrefill(true);
            }}
            aria-label="Chèn ví dụ mẫu vào khung nhập"
          >
            Dán ví dụ
          </button>
        </div>

        <label htmlFor="fc-import-textarea" className="sr-only">
          Nội dung CSV / TXT
        </label>
        <textarea
          id="fc-import-textarea"
          className="fc-import-textarea"
          value={text}
          onChange={(e) => { setText(e.target.value); setConfirmPrefill(false); }}
          spellCheck={false}
          placeholder={"# name: Tên bộ thẻ\n# description: Mô tả (không bắt buộc)\nprotocol,giao thức\nserver,máy chủ\n..."}
        />

        {confirmPrefill && (
          <p className="text-xs" style={{ color: "#fcd34d" }}>
            Đã chèn ví dụ mẫu — bạn có thể chỉnh sửa trước khi Import.
          </p>
        )}

        {error && (
          <div className="fc-import-error flex items-start gap-2">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="fc-import-actions">
          <button type="button" className="fc-btn fc-btn-ghost" onClick={handleClose}>
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

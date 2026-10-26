import { useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete this action. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-forest/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md border border-forest/15 bg-cream p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-red-200 bg-red-50 text-red-700"><AlertTriangle className="h-5 w-5" /></span>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close confirmation" className="border border-forest/15 p-1.5 text-forest/60 hover:bg-white disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-forest">{title}</h2>
        <p id="confirm-description" className="mt-2 text-sm leading-6 text-forest/65">{description}</p>
        {error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="border border-forest/20 px-4 py-2.5 text-sm font-medium text-forest transition hover:bg-white disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void confirm()} disabled={busy} className="flex items-center gap-2 bg-red-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-50">
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

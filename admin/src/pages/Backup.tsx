import { useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, FileJson2, RotateCcw, Upload } from "lucide-react";
import { createSystemBackup, restoreSystemBackup, type BackupDatasetName, type SystemBackup } from "@/lib/api";

const datasets: { key: BackupDatasetName; label: string; detail: string }[] = [
  { key: "products", label: "Products", detail: "Catalog, prices, stock, options and image links" },
  { key: "gallery", label: "Gallery projects", detail: "Project descriptions, visibility and image links" },
  { key: "videos", label: "Videos", detail: "Video details, order and hosted media links" },
  { key: "inquiries", label: "Customer inquiries", detail: "Messages, read state and follow-up notes" },
  { key: "quotes", label: "Quote requests & rates", detail: "Requests, prepared quotations and saved rates" },
  { key: "orders", label: "Orders", detail: "Customer details, items and order status" },
  { key: "logs", label: "Activity & access logs", detail: "Admin activity and sign-in history" },
];

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsv(backup: SystemBackup) {
  const records: { dataset: string; id: unknown; createdAt: unknown; record: unknown }[] = [];
  for (const [name, value] of Object.entries(backup.datasets)) {
    const rows = name === "logs" && value && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>).flatMap(([kind, entries]) => Array.isArray(entries) ? entries.map((record) => ({ dataset: `${kind} logs`, record })) : [])
      : Array.isArray(value) ? value.map((record) => ({ dataset: name, record })) : [];
    for (const row of rows) {
      const data = row.record as Record<string, unknown>;
      records.push({ dataset: row.dataset, id: data.id ?? data.key ?? "", createdAt: data.createdAt ?? "", record: row.record });
    }
  }
  return ["Dataset,ID,Created at,Record JSON", ...records.map((row) => [row.dataset, row.id, row.createdAt, row.record].map(csvValue).join(","))].join("\r\n");
}

export default function Backup() {
  const [selected, setSelected] = useState<BackupDatasetName[]>(datasets.map((item) => item.key));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [backup, setBackup] = useState<SystemBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleDataset(key: BackupDatasetName) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function exportBackup() {
    if (!selected.length) { setError("Select at least one data set to export."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await createSystemBackup({ datasets: selected, from: from || undefined, to: to || undefined });
      const date = new Date().toISOString().slice(0, 10);
      if (format === "json") download(`nilla-garden-backup-${date}.json`, JSON.stringify(result, null, 2), "application/json");
      else download(`nilla-garden-backup-${date}.csv`, toCsv(result), "text/csv;charset=utf-8");
      setNotice(`Backup downloaded with ${selected.length} selected data set${selected.length === 1 ? "" : "s"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create the backup."); }
    finally { setBusy(false); }
  }

  function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setBackup(null); setError(""); setNotice("");
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SystemBackup;
        if (parsed.application !== "nilla-garden" || parsed.backupVersion !== 1 || !parsed.datasets || typeof parsed.datasets !== "object") throw new Error("This is not a supported Nilla Garden JSON backup.");
        setBackup(parsed);
        setSelected(datasets.filter((item) => item.key === "quotes"
          ? Array.isArray(parsed.datasets.quotes) && Array.isArray(parsed.datasets.quoteRates)
          : item.key === "logs"
            ? Boolean(parsed.datasets.logs && typeof parsed.datasets.logs === "object")
            : Array.isArray(parsed.datasets[item.key])).map((item) => item.key));
        setNotice(`Loaded backup created ${new Date(parsed.createdAt).toLocaleString()}. ${parsed.filters?.from || parsed.filters?.to ? "This date-filtered backup is export-only and cannot replace full data sets." : "Select which data sets to restore."}`);
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not read this backup file."); }
    };
    reader.onerror = () => setError("Could not read this backup file.");
    reader.readAsText(file);
  }

  async function restore() {
    if (!backup || !selected.length) { setError("Load a backup and select at least one data set."); return; }
    const chosen = datasets.filter((item) => selected.includes(item.key));
    const confirmed = window.confirm(`This will replace the current ${chosen.map((item) => item.label).join(", ")} data with the data in this backup. Download a current backup first if you may need to undo this. Continue?`);
    if (!confirmed) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await restoreSystemBackup(backup, selected);
      setNotice(`Restored ${chosen.map((item) => item.label).join(", ")}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not restore the backup."); }
    finally { setBusy(false); }
  }

  return <div className="min-h-screen"><div className="admin-main"><main className="mx-auto max-w-6xl px-5 py-8">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-forest/10 pb-5">
      <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">System tools</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-forest"><DatabaseBackup className="h-6 w-6" /> Backup &amp; restore</h1><p className="mt-1.5 max-w-3xl text-sm text-forest/60">Download a copy of your Nilla Garden records or restore selected data from a backup file.</p></div>
      <span className="border border-leaf/25 bg-sage/15 px-3 py-1.5 text-xs font-medium text-forest">Local download · JSON or CSV</span>
    </div>

    {error && <p role="alert" className="mt-5 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 flex items-start gap-2 border border-leaf/20 bg-sage/15 p-3 text-sm text-forest"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />{notice}</p>}

    <section className="mt-6 border border-forest/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-forest">Choose data sets</h2><p className="mt-1 text-sm text-forest/55">All system records are selected by default.</p></div><div className="flex gap-2"><button type="button" onClick={() => setSelected(datasets.map((item) => item.key))} className="border border-forest/15 px-3 py-2 text-xs font-medium text-forest hover:bg-sage/10">Select all</button><button type="button" onClick={() => setSelected([])} className="border border-forest/15 px-3 py-2 text-xs font-medium text-forest hover:bg-sage/10">Clear</button></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {datasets.map((item) => <label key={item.key} className={`flex cursor-pointer items-start gap-3 border p-3 transition ${selected.includes(item.key) ? "border-leaf/40 bg-sage/10" : "border-forest/10 hover:bg-sage/5"}`}><input type="checkbox" checked={selected.includes(item.key)} onChange={() => toggleDataset(item.key)} className="mt-1 h-4 w-4 accent-[#2f6b3a]" /><span><span className="block text-sm font-medium text-forest">{item.label}</span><span className="mt-0.5 block text-xs text-forest/55">{item.detail}</span></span></label>)}
      </div>
    </section>

    <section className="mt-5 border border-forest/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-semibold text-forest">Export a backup</h2><p className="mt-1 text-sm text-forest/55">Choose an optional date range for dated records. Products and quote pricing are included regardless of date.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-forest/65">From date<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 block w-full border border-forest/15 bg-white px-3 py-2.5 text-sm text-forest" /></label>
        <label className="text-xs font-medium text-forest/65">To date<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 block w-full border border-forest/15 bg-white px-3 py-2.5 text-sm text-forest" /></label>
        <label className="text-xs font-medium text-forest/65">File format<select value={format} onChange={(event) => setFormat(event.target.value as "json" | "csv")} className="mt-1 block w-full border border-forest/15 bg-white px-3 py-2.5 text-sm text-forest"><option value="json">JSON · supports restore</option><option value="csv">CSV · spreadsheet view</option></select></label>
        <div className="flex items-end"><button type="button" disabled={busy || !selected.length} onClick={() => void exportBackup()} className="flex w-full items-center justify-center gap-2 bg-forest px-4 py-2.5 text-sm font-medium text-cream transition hover:bg-leaf disabled:opacity-50"><Download className="h-4 w-4" />{busy ? "Preparing…" : "Download backup"}</button></div>
      </div>
    </section>

    <section className="mt-5 border border-forest/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><RotateCcw className="mt-0.5 h-5 w-5 text-leaf" /><div><h2 className="font-semibold text-forest">Restore from a JSON backup</h2><p className="mt-1 text-sm text-forest/55">Restoring replaces the selected data sets currently in your system. CSV files are for viewing and cannot be restored.</p></div></div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><input ref={fileRef} type="file" accept=".json,application/json" onChange={readBackup} className="block max-w-full text-sm text-forest/65 file:mr-3 file:border-0 file:bg-sage/20 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-forest hover:file:bg-sage/35" />{backup && <span className="flex items-center gap-1.5 text-xs text-leaf"><FileJson2 className="h-4 w-4" />Backup file ready</span>}<button type="button" disabled={busy || !backup || Boolean(backup.filters?.from || backup.filters?.to) || !selected.length} onClick={() => void restore()} className="flex items-center gap-2 border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-40"><Upload className="h-4 w-4" />{busy ? "Restoring…" : "Restore selected data"}</button></div>
      <div className="mt-4 flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>Admin accounts, passwords, API keys, and environment secrets are not included. Product and project media files stay in Cloudinary; this backup saves their URLs. Keep backup files in a secure location because they contain customer details.</p></div>
    </section>
  </main></div></div>;
}

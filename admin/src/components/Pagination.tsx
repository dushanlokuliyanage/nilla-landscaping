import { useEffect, useState } from "react";

const PAGE_SIZE_KEY = "admin-page-size";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function usePageSize() {
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(PAGE_SIZE_KEY));
      if (PAGE_SIZE_OPTIONS.includes(saved)) setPageSize(saved);
    } catch { /* storage may be unavailable */ }
  }, []);
  function updatePageSize(value: number) {
    setPageSize(value);
    try { localStorage.setItem(PAGE_SIZE_KEY, String(value)); } catch { /* storage may be unavailable */ }
  }
  return [pageSize, updatePageSize] as const;
}

export function PageSizeControl({ pageSize, onChange }: { pageSize: number; onChange: (pageSize: number) => void }) {
  return <label className="flex items-center gap-2 text-xs font-medium text-forest/65">
    <span>Per page</span>
    <select aria-label="Items per page" value={pageSize} onChange={(event) => onChange(Number(event.target.value))} className="border border-forest/15 bg-white px-3 py-2 text-sm text-forest outline-none focus:border-leaf">
      {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
    </select>
  </label>;
}

export default function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 px-3 py-3 text-sm text-forest/65">
    <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span>
    <div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="border border-forest/15 px-3 py-1.5 disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="border border-forest/15 px-3 py-1.5 disabled:opacity-40">Next</button></div>
  </nav>;
}

export default function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 pt-4 text-sm text-forest/70"><span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="border border-forest/20 px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="border border-forest/20 px-3 py-2 disabled:opacity-40">Next</button></div></nav>;
}

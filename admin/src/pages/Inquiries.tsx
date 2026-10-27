import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Trash2, Check, Search, Inbox, MailOpen, Clock, Eye, X } from "lucide-react";
import { getCurrentAdmin, getInquiries, markAsRead, deleteInquiry, updateInquiryFollowUp, type Inquiry } from "@/lib/api";
import { useSearchParams } from "react-router-dom";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination, { PageSizeControl, usePageSize } from "@/components/Pagination";

type StatusFilter = "all" | "unread" | "read";
export default function Inquiries() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [deleting, setDeleting] = useState<Inquiry | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [savingFollowUp, setSavingFollowUp] = useState<number | null>(null);
  const [viewMode, setViewMode] = useViewMode("inquiries");
  const [canManage, setCanManage] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();

  async function load() {
    setLoading(true);
    try {
      setInquiries(await getInquiries());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    getCurrentAdmin().then((admin) => setCanManage(admin.permissions.includes("*") || admin.permissions.includes("inquiries.manage"))).catch(() => setCanManage(false));
  }, []);

  async function handleMarkRead(id: number) {
    await markAsRead(id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteInquiry(deleting.id);
    setInquiries((prev) => prev.filter((inquiry) => inquiry.id !== deleting.id));
    setDeleting(null);
  }

  async function handleSaveFollowUp(inquiry: Inquiry) {
    setSavingFollowUp(inquiry.id);
    try {
      await updateInquiryFollowUp(inquiry.id, inquiry.followUpStatus, inquiry.followUpNote ?? "");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not save follow-up details");
    } finally {
      setSavingFollowUp(null);
    }
  }

  function updateInquiry(id: number, changes: Partial<Inquiry>) {
    setInquiries((previous) => previous.map((inquiry) => inquiry.id === id ? { ...inquiry, ...changes } : inquiry));
  }

  const services = useMemo(() => Array.from(new Set(
    inquiries.map((inquiry) => inquiry.service).filter((service): service is string => Boolean(service)),
  )), [inquiries]);

  const stats = useMemo(() => {
    const unread = inquiries.filter((inquiry) => !inquiry.isRead).length;
    const today = new Date().toDateString();
    const todayCount = inquiries.filter((inquiry) => new Date(inquiry.createdAt).toDateString() === today).length;
    return { total: inquiries.length, unread, today: todayCount };
  }, [inquiries]);

  const filteredInquiries = useMemo(() => inquiries.filter((inquiry) => {
    if (statusFilter === "unread" && inquiry.isRead) return false;
    if (statusFilter === "read" && !inquiry.isRead) return false;
    if (serviceFilter !== "all" && inquiry.service !== serviceFilter) return false;
    const query = search.trim().toLowerCase();
    if (query && !`${inquiry.name} ${inquiry.email} ${inquiry.phone ?? ""} ${inquiry.message}`.toLowerCase().includes(query)) return false;
    return true;
  }), [inquiries, search, serviceFilter, statusFilter]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filteredInquiries.length / pageSize)));
  const pageInquiries = filteredInquiries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const viewing = inquiries.find((inquiry) => inquiry.id === viewingId) ?? null;
  useEffect(() => { setPage(1); }, [search, statusFilter, serviceFilter, pageSize]);
  useEffect(() => {
    const id = Number(searchParams.get("inquiry"));
    if (Number.isInteger(id) && id > 0 && inquiries.some((inquiry) => inquiry.id === id)) setViewingId(id);
  }, [searchParams, inquiries]);

  function closeInquiryDetails() {
    setViewingId(null);
    if (searchParams.has("inquiry")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("inquiry");
      setSearchParams(nextParams, { replace: true });
    }
  }



  return (
    <div className="min-h-screen">
      <div className="admin-main">
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-leaf">Inbox</p>
          <h1 className="mt-1 text-2xl font-semibold text-forest">Inquiries</h1>
          <p className="mt-2 text-sm text-forest/60">Review messages, track follow-ups, and respond to new inquiries.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><PageSizeControl pageSize={pageSize} onChange={setPageSize} /><ViewModeControl mode={viewMode} onChange={setViewMode} /></div>
        </div>

        <section aria-label="Inquiry summary" className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="border border-forest/10 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-1.5 text-forest/60 sm:gap-2"><Inbox className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /><span className="text-[9px] font-medium uppercase tracking-wide sm:text-xs">Inquiries</span></div>
            <p className="mt-1 text-xl font-semibold text-forest sm:mt-1.5 sm:text-2xl">{stats.total}</p>
          </div>
          <div className="border border-forest/10 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-1.5 text-forest/60 sm:gap-2"><MailOpen className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /><span className="text-[9px] font-medium uppercase tracking-wide sm:text-xs">Unread</span></div>
            <p className="mt-1 text-xl font-semibold text-leaf sm:mt-1.5 sm:text-2xl">{stats.unread}</p>
          </div>
          <div className="border border-forest/10 bg-white p-3 shadow-sm sm:p-4">
            <div className="flex items-center gap-1.5 text-forest/60 sm:gap-2"><Clock className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /><span className="text-[9px] font-medium uppercase tracking-wide sm:text-xs">Today</span></div>
            <p className="mt-1 text-xl font-semibold text-forest sm:mt-1.5 sm:text-2xl">{stats.today}</p>
          </div>
        </section>

        <section aria-label="Filter inquiries" className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:min-w-[200px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
            <input type="search" placeholder="Search name, email, phone, message..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20" />
          </div>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="w-full border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20 sm:w-auto">
            <option value="all">All statuses</option><option value="unread">Unread only</option><option value="read">Read only</option>
          </select>
          <select aria-label="Filter by service" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="w-full border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20 sm:w-auto">
            <option value="all">All services</option>{services.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
        </section>

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : inquiries.length === 0 ? (
          <p className="text-forest/60">No inquiries yet.</p>
        ) : filteredInquiries.length === 0 ? (
          <p className="text-forest/60">No inquiries match your filters.</p>
        ) : (
          <div className={viewMode === "cards" ? "grid gap-4 xl:grid-cols-2" : "space-y-3"}>
            {pageInquiries.map((inq) => (
              <div
                key={inq.id}
                className={`border shadow-sm ${viewMode === "list" ? "p-3" : "p-4"} ${
                  inq.isRead
                    ? "border-forest/10 bg-white/50"
                    : "border-leaf/40 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="max-w-full truncate font-semibold text-forest">{inq.name}</h3>
                      {!inq.isRead && (
                        <span className=" bg-leaf px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">
                          New
                        </span>
                      )}
                      {inq.service && (
                        <span className="bg-sage/40 px-2 py-0.5 text-[10px] text-forest">
                          {inq.service}
                        </span>
                      )}
                      <span className="border border-forest/10 px-2 py-0.5 text-[10px] capitalize text-forest/60">Follow-up: {inq.followUpStatus}</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest/60">
                      <span className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        {inq.email}
                      </span>
                      {inq.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          {inq.phone}
                        </span>
                      )}
                      <span>{new Date(inq.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className={`mt-1.5 text-xs text-forest/70 ${viewMode === "list" ? "line-clamp-1" : "line-clamp-2"}`}>{inq.message}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => setViewingId(inq.id)} className="flex items-center gap-1 border border-forest/15 px-2.5 py-1.5 text-xs font-medium text-forest transition hover:bg-sage/15">
                      <Eye className="h-3.5 w-3.5" />View
                    </button>
                    {canManage && !inq.isRead && (
                      <button
                        onClick={() => handleMarkRead(inq.id)}
                        className="flex items-center gap-1 border border-forest/15 px-2.5 py-1.5 text-xs font-medium text-forest transition hover:bg-sage/15"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Mark read</span>
                      </button>
                    )}
                    {canManage && <button
                      onClick={() => setDeleting(inq)}
                      aria-label={`Delete inquiry from ${inq.name}`}
                      className="flex items-center gap-1.5 border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && <Pagination page={currentPage} pageSize={pageSize} total={filteredInquiries.length} onChange={setPage} />}
      </main>
      </div>
      {viewing && <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/45 p-3 sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeInquiryDetails(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="inquiry-detail-title" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-forest/10 bg-cream shadow-2xl">
          <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-forest/10 bg-cream px-4 py-4 sm:px-6">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-leaf">Inquiry details</p><h2 id="inquiry-detail-title" className="mt-1 truncate text-lg font-semibold text-forest">{viewing.name}</h2></div>
            <div className="flex shrink-0 items-center gap-2">{canManage && !viewing.isRead && <button type="button" onClick={() => void handleMarkRead(viewing.id)} className="flex items-center gap-1 bg-forest px-2.5 py-1.5 text-xs font-medium text-cream hover:bg-leaf"><Check className="h-3.5 w-3.5" />Mark read</button>}<button type="button" onClick={closeInquiryDetails} aria-label="Close inquiry details" className="border border-forest/15 p-1.5 text-forest/60 hover:bg-white"><X className="h-4 w-4" /></button></div>
          </header>
          <div className="space-y-5 px-4 py-5 sm:px-6">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="break-all text-forest/70"><span className="block text-[10px] font-semibold uppercase tracking-wide text-forest/45">Email</span>{viewing.email}</p>
              <p className="text-forest/70"><span className="block text-[10px] font-semibold uppercase tracking-wide text-forest/45">Phone</span>{viewing.phone || "Not provided"}</p>
              <p className="text-forest/70"><span className="block text-[10px] font-semibold uppercase tracking-wide text-forest/45">Service</span>{viewing.service || "General inquiry"}</p>
              <p className="text-forest/70"><span className="block text-[10px] font-semibold uppercase tracking-wide text-forest/45">Received</span>{new Date(viewing.createdAt).toLocaleString()}</p>
            </div>
            <section className="border border-forest/10 bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-forest/55">Full message</h3>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-forest/85">{viewing.message}</p>
            </section>
            <section className="border border-forest/10 bg-white p-4">
              <h3 className="text-sm font-semibold text-forest">Follow-up</h3>
              <div className="mt-3 grid gap-3">
                <label className="text-xs font-medium text-forest/70">Status
                  {canManage ? <select value={viewing.followUpStatus} onChange={(event) => updateInquiry(viewing.id, { followUpStatus: event.target.value as Inquiry["followUpStatus"] })} className="mt-1.5 block w-full border border-forest/15 bg-white px-3 py-2.5 text-sm text-forest"><option value="new">New</option><option value="contacted">Contacted</option><option value="quoted">Quoted</option><option value="won">Won</option><option value="lost">Lost</option></select> : <span className="mt-1.5 block capitalize text-sm text-forest">{viewing.followUpStatus}</span>}
                </label>
                <label className="text-xs font-medium text-forest/70">Internal note
                  {canManage ? <textarea value={viewing.followUpNote ?? ""} onChange={(event) => updateInquiry(viewing.id, { followUpNote: event.target.value || null })} maxLength={2000} rows={3} placeholder="Add a reminder or conversation note…" className="mt-1.5 block w-full resize-y border border-forest/15 bg-white px-3 py-2 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20" /> : <span className="mt-1.5 block whitespace-pre-wrap text-sm text-forest">{viewing.followUpNote || "No follow-up note"}</span>}
                </label>
              </div>
              {canManage && <div className="mt-4 flex justify-end"><button type="button" onClick={() => void handleSaveFollowUp(viewing)} disabled={savingFollowUp === viewing.id} className="bg-forest px-4 py-2 text-xs font-medium text-cream transition hover:bg-leaf disabled:opacity-50">{savingFollowUp === viewing.id ? "Saving…" : "Save follow-up"}</button></div>}
            </section>
          </div>
        </section>
      </div>}
      {deleting && <ConfirmDialog title="Delete inquiry?" description={`The message from ${deleting.name} will be permanently removed from your inbox.`} onClose={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}

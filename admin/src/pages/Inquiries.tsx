import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Trash2, Check, Search, Inbox, MailOpen, Clock } from "lucide-react";
import { getCurrentAdmin, getInquiries, markAsRead, deleteInquiry, updateInquiryFollowUp, type Inquiry } from "@/lib/api";
import NavTabs from "@/components/NavTabs";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import AdminHeader from "@/components/AdminHeader";

type StatusFilter = "all" | "unread" | "read";
export default function Inquiries() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [deleting, setDeleting] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [savingFollowUp, setSavingFollowUp] = useState<number | null>(null);
  const [viewMode, setViewMode] = useViewMode("inquiries");
  const [canManage, setCanManage] = useState(false);

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



  return (
    <div className="min-h-screen">
      <AdminHeader unreadCount={stats.unread} />
      <NavTabs />

      <div className="md:ml-56">
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-leaf">Inbox</p>
          <h1 className="mt-1 text-2xl font-semibold text-forest">Inquiries</h1>
          <p className="mt-2 text-sm text-forest/60">Review messages, track follow-ups, and respond to new inquiries.</p>
          </div>
          <ViewModeControl mode={viewMode} onChange={setViewMode} />
        </div>

        <section aria-label="Inquiry summary" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className=" border border-forest/10 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 text-forest/60"><Inbox className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Total inquiries</span></div>
            <p className="mt-2 text-2xl font-semibold text-forest">{stats.total}</p>
          </div>
          <div className=" border border-forest/10 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 text-forest/60"><MailOpen className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Unread</span></div>
            <p className="mt-2 text-2xl font-semibold text-leaf">{stats.unread}</p>
          </div>
          <div className=" border border-forest/10 bg-white shadow-sm p-5">
            <div className="flex items-center gap-2 text-forest/60"><Clock className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Today</span></div>
            <p className="mt-2 text-2xl font-semibold text-forest">{stats.today}</p>
          </div>
        </section>

        <section aria-label="Filter inquiries" className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
            <input type="search" placeholder="Search name, email, phone, message..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20" />
          </div>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20">
            <option value="all">All statuses</option><option value="unread">Unread only</option><option value="read">Read only</option>
          </select>
          <select aria-label="Filter by service" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20">
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
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className={` border p-5 shadow-sm ${
                  inq.isRead
                    ? "border-forest/10 bg-white/50"
                    : "border-leaf/40 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-forest">{inq.name}</h3>
                      {!inq.isRead && (
                        <span className=" bg-leaf px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">
                          New
                        </span>
                      )}
                      {inq.service && (
                        <span className=" bg-sage/40 px-2.5 py-0.5 text-xs text-forest">
                          {inq.service}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-forest/60">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {inq.email}
                      </span>
                      {inq.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {inq.phone}
                        </span>
                      )}
                      <span>{new Date(inq.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {canManage && !inq.isRead && (
                      <button
                        onClick={() => handleMarkRead(inq.id)}
                        className="flex items-center gap-1.5  bg-forest px-3.5 py-1.5 text-xs font-medium text-cream transition hover:bg-leaf"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark read
                      </button>
                    )}
                    {canManage && <button
                      onClick={() => setDeleting(inq)}
                      className="flex items-center gap-1.5  border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>}
                  </div>
                </div>

                <p className="mt-3 text-sm text-forest/80">{inq.message}</p>

                {canManage && <div className="mt-4 grid gap-3 border-t border-forest/10 pt-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                  <label className="text-xs font-medium text-forest/70">
                    Follow-up status
                    <select value={inq.followUpStatus} onChange={(event) => updateInquiry(inq.id, { followUpStatus: event.target.value as Inquiry["followUpStatus"] })} className="mt-1.5 block w-full border border-forest/15 bg-white px-3 py-2 text-sm text-forest">
                      <option value="new">New</option><option value="contacted">Contacted</option><option value="quoted">Quoted</option><option value="won">Won</option><option value="lost">Lost</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-forest/70">
                    Internal follow-up note
                    <textarea value={inq.followUpNote ?? ""} onChange={(event) => updateInquiry(inq.id, { followUpNote: event.target.value || null })} maxLength={2000} rows={2} placeholder="Add a reminder or conversation note…" className="mt-1.5 block w-full resize-y border border-forest/15 bg-white px-3 py-2 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20" />
                  </label>
                  <button onClick={() => void handleSaveFollowUp(inq)} disabled={savingFollowUp === inq.id} className="bg-forest px-3.5 py-2 text-xs font-medium text-cream transition hover:bg-leaf disabled:opacity-50">
                    {savingFollowUp === inq.id ? "Saving…" : "Save follow-up"}
                  </button>
                </div>}
              </div>
            ))}
          </div>
        )}
      </main>
      </div>
      {deleting && <ConfirmDialog title="Delete inquiry?" description={`The message from ${deleting.name} will be permanently removed from your inbox.`} onClose={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Mail, Phone, Trash2, Check, Search, Inbox, MailOpen, Clock, ShoppingBag, TrendingUp } from "lucide-react";
import { getInquiries, getOrders, markAsRead, deleteInquiry, updateInquiryFollowUp, type Inquiry, type Order } from "@/lib/api";
import NavTabs from "@/components/NavTabs";
import AdminHeader from "@/components/AdminHeader";

type StatusFilter = "all" | "unread" | "read";
type ReportPeriod = "7" | "30" | "all";

const money = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 });

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "No change" : "New activity";
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}% vs previous period`;
}

export default function Dashboard() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<ReportPeriod>("30");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [savingFollowUp, setSavingFollowUp] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [inquiryData, orderData] = await Promise.all([getInquiries(), getOrders()]);
      setInquiries(inquiryData);
      setOrders(orderData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkRead(id: number) {
    await markAsRead(id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this inquiry?")) return;
    await deleteInquiry(id);
    setInquiries((prev) => prev.filter((i) => i.id !== id));
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

  const report = useMemo(() => {
    const now = Date.now();
    const days = period === "all" ? null : Number(period);
    const start = days === null ? null : now - days * 24 * 60 * 60 * 1000;
    const previousStart = days === null ? null : now - days * 2 * 24 * 60 * 60 * 1000;
    const within = (date: string, from: number | null) => from === null || new Date(date).getTime() >= from;
    const currentOrders = orders.filter((order) => within(order.createdAt, start));
    const currentInquiries = inquiries.filter((inquiry) => within(inquiry.createdAt, start));
    const previousOrders = days === null ? [] : orders.filter((order) => {
      const time = new Date(order.createdAt).getTime();
      return time >= previousStart! && time < start!;
    });
    const previousInquiries = days === null ? [] : inquiries.filter((inquiry) => {
      const time = new Date(inquiry.createdAt).getTime();
      return time >= previousStart! && time < start!;
    });
    const statuses = { new: 0, contacted: 0, completed: 0, cancelled: 0 };
    const productCounts = new Map<string, { quantity: number; value: number }>();
    let estimatedValue = 0;
    for (const order of currentOrders) {
      statuses[order.status] += 1;
      if (order.status === "cancelled") continue;
      for (const item of order.items) {
        const value = item.unitPrice * item.quantity;
        estimatedValue += value;
        const existing = productCounts.get(item.name) ?? { quantity: 0, value: 0 };
        existing.quantity += item.quantity;
        existing.value += value;
        productCounts.set(item.name, existing);
      }
    }
    const popularProducts = [...productCounts.entries()].sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 5);
    const recent = [
      ...currentOrders.map((order) => ({ kind: "Order", label: `#${order.id} · ${order.customerName}`, detail: `${order.items.length} item line${order.items.length === 1 ? "" : "s"} · ${order.status}`, date: order.createdAt })),
      ...currentInquiries.map((inquiry) => ({ kind: "Inquiry", label: inquiry.name, detail: inquiry.service || "General inquiry", date: inquiry.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
    return { currentOrders, currentInquiries, previousOrders, previousInquiries, statuses, estimatedValue, popularProducts, recent };
  }, [orders, inquiries, period]);

  return (
    <div className="min-h-screen">
      <AdminHeader unreadCount={stats.unread} />
      <NavTabs />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section aria-label="Business report" className="mb-10 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-leaf">Overview</p>
              <h1 className="mt-1 text-2xl font-semibold text-forest">Business report</h1>
            </div>
            <select aria-label="Report period" value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)} className="border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest">
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border border-forest/10 bg-white/70 p-5"><div className="flex items-center gap-2 text-forest/60"><ShoppingBag className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Orders</span></div><p className="mt-2 text-2xl font-semibold text-forest">{report.currentOrders.length}</p><p className="mt-1 text-xs text-forest/55">{period === "all" ? `${report.statuses.new} new · ${report.statuses.contacted} contacted · ${report.statuses.completed} completed` : percentChange(report.currentOrders.length, report.previousOrders.length)}</p></div>
            <div className="border border-forest/10 bg-white/70 p-5"><div className="flex items-center gap-2 text-forest/60"><TrendingUp className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Estimated order value</span></div><p className="mt-2 text-2xl font-semibold text-forest">{money.format(report.estimatedValue)}</p><p className="mt-1 text-xs text-forest/55">Based on requested quantities and listed prices</p></div>
            <div className="border border-forest/10 bg-white/70 p-5"><div className="flex items-center gap-2 text-forest/60"><Inbox className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Inquiries</span></div><p className="mt-2 text-2xl font-semibold text-forest">{report.currentInquiries.length}</p><p className="mt-1 text-xs text-forest/55">{period === "all" ? `${inquiries.filter((inquiry) => !inquiry.isRead).length} unread in total` : percentChange(report.currentInquiries.length, report.previousInquiries.length)}</p></div>
            <div className="border border-forest/10 bg-white/70 p-5"><div className="flex items-center gap-2 text-forest/60"><Clock className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Order statuses</span></div><p className="mt-2 text-sm font-medium text-forest">{report.statuses.new} new · {report.statuses.contacted} contacted</p><p className="mt-1 text-xs text-forest/55">{report.statuses.completed} completed · {report.statuses.cancelled} cancelled</p></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border border-forest/10 bg-white/70 p-5">
              <h2 className="font-semibold text-forest">Popular products</h2>
              {report.popularProducts.length ? <ul className="mt-4 divide-y divide-forest/10">{report.popularProducts.map(([name, stats]) => <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="text-forest">{name}</span><span className="shrink-0 text-forest/60">{stats.quantity} requested · {money.format(stats.value)}</span></li>)}</ul> : <p className="mt-3 text-sm text-forest/55">No product orders for this period.</p>}
            </div>
            <div className="border border-forest/10 bg-white/70 p-5">
              <h2 className="font-semibold text-forest">Recent activity</h2>
              {report.recent.length ? <ul className="mt-4 divide-y divide-forest/10">{report.recent.map((item, index) => <li key={`${item.kind}-${item.date}-${index}`} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><span className="text-[10px] font-medium uppercase tracking-wide text-leaf">{item.kind}</span><p className="truncate text-sm font-medium text-forest">{item.label}</p><p className="truncate text-xs text-forest/55">{item.detail}</p></div><time className="shrink-0 text-xs text-forest/55">{new Date(item.date).toLocaleDateString()}</time></li>)}</ul> : <p className="mt-3 text-sm text-forest/55">No recent activity for this period.</p>}
            </div>
          </div>
        </section>

        <section aria-label="Inquiry summary" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border border-forest/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 text-forest/60"><Inbox className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Total inquiries</span></div>
            <p className="mt-2 text-2xl font-semibold text-forest">{stats.total}</p>
          </div>
          <div className="border border-forest/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 text-forest/60"><MailOpen className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Unread</span></div>
            <p className="mt-2 text-2xl font-semibold text-leaf">{stats.unread}</p>
          </div>
          <div className="border border-forest/10 bg-white/60 p-5">
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
          <div className="space-y-4">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className={` border p-5 ${
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
                        <span className="rounded-full bg-leaf px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">
                          New
                        </span>
                      )}
                      {inq.service && (
                        <span className="rounded-full bg-sage/40 px-2.5 py-0.5 text-xs text-forest">
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
                    {!inq.isRead && (
                      <button
                        onClick={() => handleMarkRead(inq.id)}
                        className="flex items-center gap-1.5  bg-forest px-3.5 py-1.5 text-xs font-medium text-cream transition hover:bg-leaf"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inq.id)}
                      className="flex items-center gap-1.5  border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-forest/80">{inq.message}</p>

                <div className="mt-4 grid gap-3 border-t border-forest/10 pt-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

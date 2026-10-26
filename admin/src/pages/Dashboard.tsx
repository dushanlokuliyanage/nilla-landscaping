import { useEffect, useMemo, useState } from "react";
import { Inbox, ShoppingBag, TrendingUp, Clock } from "lucide-react";
import { getCurrentAdmin, getInquiries, getOrders, type Inquiry, type Order } from "@/lib/api";
import NavTabs from "@/components/NavTabs";
import AdminHeader from "@/components/AdminHeader";

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
  useEffect(() => {
    getCurrentAdmin().then(async (admin) => {
      const canReadInquiries = admin.permissions.includes("*") || admin.permissions.includes("inquiries.read");
      const canReadOrders = admin.permissions.includes("*") || admin.permissions.includes("orders.read");
      const [inquiryData, orderData] = await Promise.all([
        canReadInquiries ? getInquiries() : Promise.resolve([]),
        canReadOrders ? getOrders() : Promise.resolve([]),
      ]);
      setInquiries(inquiryData);
      setOrders(orderData);
    }).catch(() => { setInquiries([]); setOrders([]); }).finally(() => setLoading(false));
  }, []);
  const unreadCount = inquiries.filter((inquiry) => !inquiry.isRead).length;

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
      <AdminHeader unreadCount={unreadCount} />
      <NavTabs />
      <div className="md:ml-56">
      <main className="mx-auto max-w-6xl px-5 py-8">
        {loading ? <p className="text-forest/60">Loading overview...</p> : null}
        <section aria-label="Business report" className="mb-10 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Your business at a glance</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Overview</h1>
            </div>
            <select aria-label="Report period" value={period} onChange={(event) => setPeriod(event.target.value as ReportPeriod)} className="border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest">
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className=" border border-forest/10 bg-white shadow-sm p-5"><div className="flex items-center gap-2 text-forest/60"><ShoppingBag className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Orders</span></div><p className="mt-2 text-2xl font-semibold text-forest">{report.currentOrders.length}</p><p className="mt-1 text-xs text-forest/55">{period === "all" ? `${report.statuses.new} new · ${report.statuses.contacted} contacted · ${report.statuses.completed} completed` : percentChange(report.currentOrders.length, report.previousOrders.length)}</p></div>
            <div className=" border border-forest/10 bg-white shadow-sm p-5"><div className="flex items-center gap-2 text-forest/60"><TrendingUp className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Estimated order value</span></div><p className="mt-2 text-2xl font-semibold text-forest">{money.format(report.estimatedValue)}</p><p className="mt-1 text-xs text-forest/55">Based on requested quantities and listed prices</p></div>
            <div className=" border border-forest/10 bg-white shadow-sm p-5"><div className="flex items-center gap-2 text-forest/60"><Inbox className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Inquiries</span></div><p className="mt-2 text-2xl font-semibold text-forest">{report.currentInquiries.length}</p><p className="mt-1 text-xs text-forest/55">{period === "all" ? `${inquiries.filter((inquiry) => !inquiry.isRead).length} unread in total` : percentChange(report.currentInquiries.length, report.previousInquiries.length)}</p></div>
            <div className=" border border-forest/10 bg-white shadow-sm p-5"><div className="flex items-center gap-2 text-forest/60"><Clock className="h-4 w-4" /><span className="text-xs uppercase tracking-wide">Order statuses</span></div><p className="mt-2 text-sm font-medium text-forest">{report.statuses.new} new · {report.statuses.contacted} contacted</p><p className="mt-1 text-xs text-forest/55">{report.statuses.completed} completed · {report.statuses.cancelled} cancelled</p></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className=" border border-forest/10 bg-white shadow-sm p-5">
              <h2 className="font-semibold text-forest">Popular products</h2>
              {report.popularProducts.length ? <ul className="mt-4 divide-y divide-forest/10">{report.popularProducts.map(([name, stats]) => <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="text-forest">{name}</span><span className="shrink-0 text-forest/60">{stats.quantity} requested · {money.format(stats.value)}</span></li>)}</ul> : <p className="mt-3 text-sm text-forest/55">No product orders for this period.</p>}
            </div>
            <div className=" border border-forest/10 bg-white shadow-sm p-5">
              <h2 className="font-semibold text-forest">Recent activity</h2>
              {report.recent.length ? <ul className="mt-4 divide-y divide-forest/10">{report.recent.map((item, index) => <li key={`${item.kind}-${item.date}-${index}`} className="flex items-center justify-between gap-3 py-2"><div className="min-w-0"><span className="text-[10px] font-medium uppercase tracking-wide text-leaf">{item.kind}</span><p className="truncate text-sm font-medium text-forest">{item.label}</p><p className="truncate text-xs text-forest/55">{item.detail}</p></div><time className="shrink-0 text-xs text-forest/55">{new Date(item.date).toLocaleDateString()}</time></li>)}</ul> : <p className="mt-3 text-sm text-forest/55">No recent activity for this period.</p>}
            </div>
          </div>
        </section>
      </main>
      </div>
    </div>
  );
}

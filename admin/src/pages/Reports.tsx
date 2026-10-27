import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Download, FileText, Inbox, ShoppingBag, TrendingUp } from "lucide-react";
import { getCurrentAdmin, getInquiries, getOrders, type Inquiry, type Order } from "@/lib/api";

const currency = new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 });
const dateInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayStart = (value: string) => new Date(`${value}T00:00:00`).getTime();
type ReportType = "all" | "orders" | "inquiries";

export default function Reports() {
  const today = new Date();
  const [from, setFrom] = useState(() => dateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)));
  const [to, setTo] = useState(() => dateInput(today));
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [canReadOrders, setCanReadOrders] = useState(false);
  const [canReadInquiries, setCanReadInquiries] = useState(false);
  const [reportType, setReportType] = useState<ReportType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getCurrentAdmin().then(async (admin) => {
      const all = admin.permissions.includes("*");
      const orderAccess = all || admin.permissions.includes("orders.read");
      const inquiryAccess = all || admin.permissions.includes("inquiries.read");
      setCanReadOrders(orderAccess);
      setCanReadInquiries(inquiryAccess);
      if (!orderAccess && inquiryAccess) setReportType("inquiries");
      else if (orderAccess && !inquiryAccess) setReportType("orders");
      const [orderRows, inquiryRows] = await Promise.all([
        orderAccess ? getOrders() : Promise.resolve([]),
        inquiryAccess ? getInquiries() : Promise.resolve([]),
      ]);
      setOrders(orderRows);
      setInquiries(inquiryRows);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load report data"))
      .finally(() => setLoading(false));
  }, []);

  const report = useMemo(() => {
    const start = dayStart(from);
    const end = dayStart(to) + 24 * 60 * 60 * 1000;
    const included = (date: string) => new Date(date).getTime() >= start && new Date(date).getTime() < end;
    const filteredOrders = orders.filter((order) => included(order.createdAt));
    const filteredInquiries = inquiries.filter((inquiry) => included(inquiry.createdAt));
    const statusCounts = { new: 0, contacted: 0, completed: 0, cancelled: 0 };
    const products = new Map<string, { quantity: number; value: number }>();
    let estimatedSales = 0;
    let completedSales = 0;
    for (const order of filteredOrders) {
      statusCounts[order.status] += 1;
      if (order.status === "cancelled") continue;
      const total = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      estimatedSales += total;
      if (order.status === "completed") completedSales += total;
      for (const item of order.items) {
        const row = products.get(item.name) ?? { quantity: 0, value: 0 };
        row.quantity += item.quantity;
        row.value += item.unitPrice * item.quantity;
        products.set(item.name, row);
      }
    }
    const inquiryStages = { new: 0, contacted: 0, quoted: 0, won: 0, lost: 0 };
    for (const inquiry of filteredInquiries) inquiryStages[inquiry.followUpStatus] += 1;
    const popularProducts = [...products.entries()].sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 8);
    return { filteredOrders, filteredInquiries, statusCounts, inquiryStages, estimatedSales, completedSales, popularProducts };
  }, [from, to, orders, inquiries]);

  function selectRange(days: number) {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (days - 1));
    setFrom(dateInput(start));
    setTo(dateInput(end));
  }
  const todayKey = dateInput(new Date());
  const quickRange = to === todayKey
    ? from === dateInput(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 6)) ? "7"
      : from === dateInput(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 29)) ? "30"
        : from === "2000-01-01" ? "all" : "custom"
    : "custom";
  const rangeButtonClass = (range: string) => `border px-3 py-2 text-xs transition ${quickRange === range ? "border-forest bg-forest font-semibold text-cream" : "border-forest/15 bg-white text-forest hover:bg-sage/15"}`;
  const scopeButtonClass = (scope: ReportType) => `border px-3 py-2 text-xs transition ${reportType === scope ? "border-forest bg-forest font-semibold text-cream" : "border-forest/15 bg-white text-forest hover:bg-sage/15"}`;
  const reportTitle = reportType === "inquiries" ? "Inquiry report" : reportType === "orders" ? "Orders report" : "Business report";
  const reportDescription = reportType === "inquiries" ? "Customer inquiries, unread messages, and follow-up progress for the selected period." : reportType === "orders" ? "Order volume, estimated sales, and requested products for the selected period." : "Orders, estimated sales, product demand, and customer inquiries for the selected period.";

  return <div className="min-h-screen report-page"><div className="admin-main">
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="report-screen-heading mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Business insights</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">{reportTitle}</h1><p className="mt-1.5 text-sm text-forest/60">{reportDescription}</p></div>
        <button type="button" onClick={() => window.print()} className="report-controls flex items-center gap-2 bg-forest px-4 py-2.5 text-sm font-medium text-cream hover:bg-leaf"><Download className="h-4 w-4" /> Export PDF</button>
      </div>
      <section className="report-controls mb-6 flex flex-wrap items-end gap-4 border border-forest/10 bg-white p-4">
        {(canReadOrders && canReadInquiries) && <div><p className="mb-1.5 text-xs text-forest/60">Report includes</p><div className="flex flex-wrap gap-2"><button type="button" aria-pressed={reportType === "all"} onClick={() => setReportType("all")} className={scopeButtonClass("all")}>All activity</button><button type="button" aria-pressed={reportType === "orders"} onClick={() => setReportType("orders")} className={scopeButtonClass("orders")}>Orders only</button><button type="button" aria-pressed={reportType === "inquiries"} onClick={() => setReportType("inquiries")} className={scopeButtonClass("inquiries")}>Inquiries only</button></div></div>}
        <label className="text-xs text-forest/60">From<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block border border-forest/15 px-3 py-2 text-sm text-forest" /></label>
        <label className="text-xs text-forest/60">To<input type="date" value={to} min={from} max={dateInput(new Date())} onChange={(event) => setTo(event.target.value)} className="mt-1 block border border-forest/15 px-3 py-2 text-sm text-forest" /></label>
        <div className="flex gap-2"><button type="button" aria-pressed={quickRange === "7"} onClick={() => selectRange(7)} className={rangeButtonClass("7")}>7 days</button><button type="button" aria-pressed={quickRange === "30"} onClick={() => selectRange(30)} className={rangeButtonClass("30")}>30 days</button><button type="button" aria-pressed={quickRange === "all"} onClick={() => { setFrom("2000-01-01"); setTo(dateInput(new Date())); }} className={rangeButtonClass("all")}>All time</button></div>
      </section>
      <div className="report-content">
        <header className="report-letterhead hidden text-center print:block">
          <h2 className="report-contractor-name">SAMANTHA ENTERPRISES</h2>
          <p className="report-contractor-details">Government &amp; Private Civil Contractor, Gardening Works and Land Reclamation and Filling</p>
          <p className="report-contractor-details">Provincial Council Reg: W/15616&nbsp; | &nbsp;CIDA Reg: 17743&nbsp; | &nbsp;SLIER DC No: RR00094233</p>
          <hr />
          <h3 className="report-company-name">Nilla Garden Service and Landscaping Company</h3>
          <h1 className="report-pdf-title">{reportTitle}</h1>
          <p className="report-pdf-description">{reportDescription}</p>
          <p className="report-period">Reporting period: {from} to {to}</p>
        </header>
        {loading ? <p className="text-sm text-forest/60">Loading report…</p> : error ? <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {canReadOrders && reportType !== "inquiries" && <Metric icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={report.filteredOrders.length} detail={`${report.statusCounts.new} new · ${report.statusCounts.contacted} in progress`} />}
            {canReadOrders && reportType !== "inquiries" && <Metric icon={<TrendingUp className="h-4 w-4" />} label="Estimated sales" value={currency.format(report.estimatedSales)} detail="Excludes cancelled orders; based on listed prices" />}
            {canReadOrders && reportType !== "inquiries" && <Metric icon={<FileText className="h-4 w-4" />} label="Completed order value" value={currency.format(report.completedSales)} detail={`${report.statusCounts.completed} completed orders`} />}
            {canReadInquiries && reportType !== "orders" && <Metric icon={<Inbox className="h-4 w-4" />} label="Inquiries received" value={report.filteredInquiries.length} detail={`${report.filteredInquiries.filter((item) => !item.isRead).length} unread`} />}
          </section>
          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            {canReadOrders && reportType !== "inquiries" && <div className="border border-forest/10 bg-white p-5"><h2 className="font-semibold text-forest">Order status</h2><div className="mt-3 divide-y divide-forest/10">{Object.entries(report.statusCounts).map(([status, count]) => <div key={status} className="flex justify-between py-2 text-sm capitalize"><span className="text-forest/70">{status}</span><span className="font-medium text-forest">{count}</span></div>)}</div></div>}
            {canReadInquiries && reportType !== "orders" && <div className="border border-forest/10 bg-white p-5"><h2 className="font-semibold text-forest">Inquiry follow-up</h2><div className="mt-3 divide-y divide-forest/10">{Object.entries(report.inquiryStages).map(([stage, count]) => <div key={stage} className="flex justify-between py-2 text-sm capitalize"><span className="text-forest/70">{stage}</span><span className="font-medium text-forest">{count}</span></div>)}</div></div>}
            {canReadOrders && reportType !== "inquiries" && <div className="border border-forest/10 bg-white p-5 lg:col-span-2"><h2 className="font-semibold text-forest">Products requested</h2>{report.popularProducts.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-forest/10 text-xs text-forest/55"><tr><th className="py-2">Product</th><th className="py-2">Quantity</th><th className="py-2 text-right">Value</th></tr></thead><tbody>{report.popularProducts.map(([name, stats]) => <tr key={name} className="border-b border-forest/5"><td className="py-2.5">{name}</td><td className="py-2.5">{stats.quantity}</td><td className="py-2.5 text-right">{currency.format(stats.value)}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-forest/55">No order items in this period.</p>}</div>}
          </section>
          {canReadInquiries && reportType !== "orders" && <section className="mt-5 overflow-hidden border border-forest/10 bg-white"><div className="border-b border-forest/10 p-5"><h2 className="font-semibold text-forest">Inquiry details</h2><p className="mt-1 text-xs text-forest/55">{report.filteredInquiries.length} inquiries in the selected period</p></div>{report.filteredInquiries.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-sage/10 text-xs text-forest/60"><tr><th className="p-3">Received</th><th className="p-3">Customer</th><th className="p-3">Contact</th><th className="p-3">Service</th><th className="p-3">Follow-up</th><th className="p-3">Read</th></tr></thead><tbody>{report.filteredInquiries.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => <tr key={item.id} className="border-t border-forest/5 align-top"><td className="whitespace-nowrap p-3 text-xs text-forest/60">{new Date(item.createdAt).toLocaleDateString()}</td><td className="max-w-xs p-3"><p className="font-medium text-forest">{item.name}</p><p className="mt-1 line-clamp-3 text-xs leading-5 text-forest/55">{item.message}</p></td><td className="p-3 text-xs">{item.email}{item.phone && <span className="mt-1 block text-forest/55">{item.phone}</span>}</td><td className="p-3 text-xs text-forest/70">{item.service || "General"}</td><td className="p-3 text-xs capitalize text-forest/70">{item.followUpStatus}</td><td className="p-3 text-xs text-forest/70">{item.isRead ? "Read" : "Unread"}</td></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-forest/55">No inquiries in this period.</p>}</section>}
          {canReadOrders && reportType !== "inquiries" && <p className="mt-5 text-xs text-forest/50">Sales are estimates based on order quantities and listed prices. The system does not record payments, refunds, taxes, or delivery charges.</p>}
        </>}
      </div>
    </main>
  </div></div>;
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string | number; detail: string }) {
  return <article className="border border-forest/10 bg-white p-5"><div className="flex items-center gap-2 text-forest/60">{icon}<span className="text-xs uppercase tracking-wide">{label}</span></div><p className="mt-2 text-2xl font-semibold text-forest">{value}</p><p className="mt-1 text-xs text-forest/55">{detail}</p></article>;
}

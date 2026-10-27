import { useEffect, useMemo, useState } from "react";
import { Phone, Mail, MapPin, Trash2 } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import ViewModeControl, { useViewMode } from "@/components/ViewModeControl";
import ConfirmDialog from "@/components/ConfirmDialog";
import Pagination from "@/components/Pagination";
import {
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getCurrentAdmin,
  type Order,
  type OrderStatus,
} from "@/lib/api";

const STATUSES: OrderStatus[] = ["new", "contacted", "completed", "cancelled"];

const badge: Record<OrderStatus, string> = {
  new: "bg-leaf text-cream",
  contacted: "bg-earth/20 text-earth",
  completed: "bg-sage/50 text-forest",
  cancelled: "bg-red-100 text-red-700",
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [viewMode, setViewMode] = useViewMode("orders");
  const [canManage, setCanManage] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
    getCurrentAdmin().then((admin) => setCanManage(admin.permissions.includes("*") || admin.permissions.includes("orders.manage"))).catch(() => setCanManage(false));
  }, []);

  async function handleStatus(id: number, status: OrderStatus) {
    await updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function handleDelete() {
    if (!deleting) return;
    await deleteOrder(deleting.id);
    setOrders((prev) => prev.filter((order) => order.id !== deleting.id));
    setDeleting(null);
  }

  const newCount = orders.filter((o) => o.status === "new").length;
  const filtered = useMemo(
    () => orders.filter((o) => filter === "all" || o.status === filter),
    [orders, filter]
  );
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)));
  const pageOrders = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />

      <div className="ml-16 md:ml-56">
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Fulfillment</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Orders <span className="ml-1 align-middle  bg-sage/25 px-2.5 py-1 text-xs font-medium text-forest/70">{orders.length}</span></h1>
            <p className="mt-1.5 text-sm text-forest/55">{newCount} waiting for a response</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
          <ViewModeControl mode={viewMode} onChange={setViewMode} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | OrderStatus)}
            className=" border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          </div>
        </div>

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-forest/60">No orders found.</p>
        ) : (
          <div className={viewMode === "cards" ? "grid gap-4 xl:grid-cols-2" : "space-y-3"}>
            {pageOrders.map((o) => {
              const total = o.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
              return (
                <div
                  key={o.id}
                  className=" border border-forest/10 bg-white shadow-sm p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 break-words font-semibold text-forest">
                          #{o.id} · {o.customerName}
                        </h3>
                        <span
                          className={` px-2.5 py-0.5 text-xs font-medium ${badge[o.status]}`}
                        >
                          {o.status}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-forest/60">
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {o.phone}
                        </span>
                        {o.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5" />
                            {o.email}
                          </span>
                        )}
                        {o.address && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {o.address}
                          </span>
                        )}
                        <span>{new Date(o.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {canManage && <div className="flex items-center gap-2">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatus(o.id, e.target.value as OrderStatus)}
                        className=" border border-forest/15 bg-white px-3 py-1.5 text-xs text-forest outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setDeleting(o)}
                        className="flex items-center gap-1.5  border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>}
                  </div>

                  <ul className="mt-4 space-y-2 border-t border-forest/10 pt-4">
                    {o.items.map((i, idx) => (
                      <li key={idx} className="text-sm text-forest">
                        <span className="font-medium">{i.name}</span> · {i.quantity} {i.unit}{" "}
                        @ Rs. {i.unitPrice}
                        {Object.keys(i.options).length > 0 && (
                          <span className="block text-xs text-forest/60">
                            {Object.entries(i.options)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {o.note && (
                    <p className="mt-3 text-sm text-forest/70">Note: {o.note}</p>
                  )}

                  <p className="mt-3 text-sm font-semibold text-forest">
                    Estimated total: Rs. {total}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {!loading && <Pagination page={currentPage} pageSize={pageSize} total={filtered.length} onChange={setPage} />}
      </main>
      </div>
      {deleting && <ConfirmDialog title="Delete order?" description={`Order #${deleting.id} for ${deleting.customerName} will be permanently removed from your order list.`} onClose={() => setDeleting(null)} onConfirm={handleDelete} />}
    </div>
  );
}

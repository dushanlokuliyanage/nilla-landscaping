import { useEffect, useMemo, useState } from "react";
import { Phone, Mail, MapPin, Trash2 } from "lucide-react";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";
import {
  getOrders,
  updateOrderStatus,
  deleteOrder,
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  async function handleStatus(id: number, status: OrderStatus) {
    await updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this order?")) return;
    await deleteOrder(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  const newCount = orders.filter((o) => o.status === "new").length;
  const filtered = useMemo(
    () => orders.filter((o) => filter === "all" || o.status === filter),
    [orders, filter]
  );

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-forest">
            Orders ({orders.length}){" "}
            <span className="text-sm font-normal text-forest/60">{newCount} new</span>
          </h2>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | OrderStatus)}
            className="rounded-none border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20"
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-forest/60">No orders found.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((o) => {
              const total = o.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
              return (
                <div
                  key={o.id}
                  className="rounded-none border border-forest/10 bg-white/60 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-forest">
                          #{o.id} · {o.customerName}
                        </h3>
                        <span
                          className={`rounded-none px-2.5 py-0.5 text-xs font-medium ${badge[o.status]}`}
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

                    <div className="flex items-center gap-2">
                      <select
                        value={o.status}
                        onChange={(e) => handleStatus(o.id, e.target.value as OrderStatus)}
                        className="rounded-none border border-forest/15 bg-white px-3 py-1.5 text-xs text-forest outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="flex items-center gap-1.5 rounded-none border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
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
      </main>
    </div>
  );
}

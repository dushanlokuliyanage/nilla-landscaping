"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, Leaf, Send } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { submitOrder } from "@/lib/api";

const inputClass =
  "w-full border border-forest/15 bg-white px-4 py-3 text-forest placeholder:text-forest/40 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

export default function CartView() {
  const { items, total, ready, setQuantity, removeItem, clear } = useCart();
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    note: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState<{ name: string; phone: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitOrder({
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          options: i.options,
        })),
      });
      setDone({ name: form.customerName.trim(), phone: form.phone.trim() });
      clear();
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (done) {
    return (
      <div className="max-w-xl border border-leaf/30 bg-sage/20 p-8 text-forest">
        <p className="font-display text-2xl font-semibold">Order request sent!</p>
        <p className="mt-3 text-forest/70">
          Thank you, {done.name}. We received your request and will contact you on{" "}
          {done.phone} shortly to confirm.
        </p>
        <Link href="/shop" className="mt-5 inline-block text-leaf underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (!ready) {
    return <p className="text-forest/60">Loading...</p>;
  }

  if (items.length === 0) {
    return (
      <div>
        <p className="text-forest/70">Your cart is empty.</p>
        <Link
          href="/shop"
          className="mt-5 inline-flex bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <ul className="space-y-4">
        {items.map((i) => (
          <li
            key={i.key}
            className="flex gap-4 border border-forest/10 bg-white/60 p-4"
          >
            <div className="h-24 w-24 shrink-0 overflow-hidden bg-sage/20">
              {i.image ? (
                <img src={i.image} alt={i.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Leaf className="h-8 w-8 text-forest/20" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/product?slug=${encodeURIComponent(i.slug)}`}
                    className="font-display text-lg font-semibold text-forest transition hover:text-leaf"
                  >
                    {i.name}
                  </Link>
                  {Object.keys(i.options).length > 0 && (
                    <p className="text-sm text-forest/60">
                      {Object.entries(i.options)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </p>
                  )}
                  <p className="text-sm text-forest/60">
                    Rs. {i.unitPrice.toLocaleString()} {i.unit}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(i.key)}
                  aria-label={`Remove ${i.name}`}
                  className="text-forest/40 transition hover:text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(i.key, i.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="flex h-9 w-9 items-center justify-center border border-forest/20 text-forest transition hover:bg-white"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={i.quantity}
                    onChange={(e) => setQuantity(i.key, Number(e.target.value))}
                    className="h-9 w-20 border border-forest/15 bg-white text-center text-forest outline-none focus:border-leaf"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(i.key, i.quantity + 1)}
                    aria-label="Increase quantity"
                    className="flex h-9 w-9 items-center justify-center border border-forest/20 text-forest transition hover:bg-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <p className="font-semibold text-forest">
                  Rs. {(i.unitPrice * i.quantity).toLocaleString()}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSubmit}
        className="h-fit space-y-4 border border-forest/10 bg-white/60 p-6 lg:sticky lg:top-24"
      >
        <h2 className="font-display text-xl font-semibold text-forest">Your details</h2>

        <input
          required
          placeholder="Your name"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          className={inputClass}
        />
        <input
          required
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputClass}
        />
        <input
          required
          placeholder="Delivery address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className={inputClass}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputClass}
        />
        <textarea
          rows={3}
          placeholder="Note (optional)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className={inputClass}
        />

        <div className="flex items-center justify-between border-t border-forest/10 pt-4">
          <span className="text-sm text-forest/70">Estimated total</span>
          <span className="text-lg font-semibold text-forest">
            Rs. {total.toLocaleString()}
          </span>
        </div>

        {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex w-full items-center justify-center gap-2 bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf disabled:opacity-50"
        >
          {status === "loading" ? "Sending..." : "Send order request"}
          <Send className="h-4 w-4" />
        </button>
        <p className="text-center text-xs text-forest/50">
          No payment now. We&apos;ll contact you to confirm your order.
        </p>
      </form>
    </div>
  );
}
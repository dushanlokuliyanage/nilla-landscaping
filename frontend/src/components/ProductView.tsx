"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Leaf, Send } from "lucide-react";
import { getProduct, submitOrder, type Product } from "@/lib/api";

const inputClass =
  "w-full  border border-forest/15 bg-white px-4 py-3 text-forest placeholder:text-forest/40 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

export default function ProductView() {
  const slug = useSearchParams().get("slug");

  const [product, setProduct] = useState<Product | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [activeImage, setActiveImage] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    note: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!slug) {
      setLoadState("notfound");
      return;
    }
    getProduct(slug)
      .then((p) => {
        if (!p) {
          setLoadState("notfound");
          return;
        }
        const defaults: Record<string, string> = {};
        p.options.forEach((o) => {
          defaults[o.name] = o.values[0];
        });
        setProduct(p);
        setSelected(defaults);
        setLoadState("ready");
      })
      .catch(() => setLoadState("notfound"));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitOrder({
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        items: [{ productId: product.id, quantity, options: selected }],
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (loadState === "loading") {
    return <p className="text-forest/60">Loading...</p>;
  }

  if (loadState === "notfound" || !product) {
    return (
      <div>
        <p className="text-forest/70">Sorry, we couldn&apos;t find that product.</p>
        <Link href="/shop" className="mt-4 inline-block text-leaf underline">
          Back to shop
        </Link>
      </div>
    );
  }

  const total = product.price * quantity;

  return (
    <div>
      <Link
        href="/shop"
        className="mb-8 inline-flex items-center gap-2 text-sm text-forest/70 transition hover:text-leaf"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to shop
      </Link>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-none bg-sage/20">
            {product.images[activeImage] ? (
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Leaf className="h-16 w-16 text-forest/20" />
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-20 w-20 overflow-hidden rounded-none border-2 transition ${
                    i === activeImage ? "border-leaf" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details + order form */}
        <div>
          <h1 className="font-display text-3xl font-semibold text-forest md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-xl font-medium text-leaf">
            Rs. {product.price.toLocaleString()}{" "}
            <span className="text-base font-normal text-forest/50">{product.unit}</span>
          </p>

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-forest/70">{product.description}</p>
          )}

          {!product.inStock ? (
            <p className="mt-8 rounded-none bg-red-50 px-5 py-4 text-sm text-red-700">
              This product is currently out of stock.
            </p>
          ) : status === "success" ? (
            <div className="mt-8 rounded-none border border-leaf/30 bg-sage/20 p-6 text-forest">
              <p className="font-display text-xl font-semibold">Order request sent!</p>
              <p className="mt-2 text-sm text-forest/70">
                Thank you, {form.customerName}. We received your request for {quantity}{" "}
                {product.name} and will contact you on {form.phone} shortly.
              </p>
              <Link href="/shop" className="mt-4 inline-block text-sm text-leaf underline">
                Continue shopping
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {product.options.map((opt) => (
                <div key={opt.name}>
                  <p className="mb-2 text-sm font-medium text-forest">{opt.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSelected({ ...selected, [opt.name]: v })}
                        className={`rounded-none border px-4 py-2 text-sm transition ${
                          selected[opt.name] === v
                            ? "border-forest bg-forest text-cream"
                            : "border-forest/20 text-forest hover:border-leaf"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="mb-2 block text-sm font-medium text-forest">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                  className={`${inputClass} max-w-[10rem]`}
                />
                <p className="mt-2 text-sm text-forest/60">
                  Estimated total:{" "}
                  <span className="font-semibold text-forest">Rs. {total.toLocaleString()}</span>
                </p>
              </div>

              <div className="border-t border-forest/10 pt-5">
                <p className="mb-4 text-sm font-medium text-forest">Your details</p>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
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
                  </div>
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
                </div>
              </div>

              {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-none bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send order request"}
                <Send className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-forest/50">
                No payment now. We&apos;ll contact you to confirm your order.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

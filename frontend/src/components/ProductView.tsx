"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Leaf, ShoppingBag } from "lucide-react";
import { getProduct, type Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";

const inputClass =
  "w-full  border border-forest/15 bg-white px-4 py-3 text-forest placeholder:text-forest/40 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

export default function ProductView() {
  const slug = useSearchParams().get("slug");
  const router = useRouter();
  const { addItem, items } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [activeImage, setActiveImage] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!slug) return;
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

  function putInCart(showDrawer = true) {
    if (!product) return;
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? null,
      unitPrice: product.price,
      unit: product.unit,
      quantity,
      stockQuantity: product.stockQuantity,
      options: selected,
    }, showDrawer);
  }

  function handleAddToCart() {
    if (!product || quantity > remaining) return;
    putInCart();
    setAdded(true);
    setQuantity(1);
  }

  function handleOrderNow() {
    if (!product || quantity > remaining) return;
    putInCart(false);
    router.push("/cart");
  }

  if (loadState === "loading" && slug) {
    return <p className="text-forest/60">Loading...</p>;
  }

  if (!slug || loadState === "notfound" || !product) {
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
  const alreadyInCart = items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
  const remaining = Math.max(0, product.stockQuantity - alreadyInCart);
  const unitLabel = product.unit.replace(/^per\s+/i, "");

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

        {/* Details */}
        <div>
          <h1 className="break-words font-display text-3xl font-semibold text-forest md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-xl font-medium text-leaf">
            Rs. {product.price.toLocaleString()}{" "}
            <span className="text-base font-normal text-forest/50">{product.unit}</span>
          </p>

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-forest/70">{product.description}</p>
          )}

          {!product.inStock || product.stockQuantity <= 0 ? (
            <p className="mt-8 rounded-none bg-red-50 px-5 py-4 text-sm text-red-700">
              This product is currently out of stock.
            </p>
          ) : (
            <div className="mt-8 space-y-5">
              {product.options.map((opt) => (
                <div key={opt.name}>
                  <p className="mb-2 text-sm font-medium text-forest">{opt.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setSelected({ ...selected, [opt.name]: v });
                          setAdded(false);
                        }}
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
                  max={Math.max(1, remaining)}
                  value={quantity}
                  onChange={(e) => {
                    const requested = Math.max(1, Math.floor(Number(e.target.value)) || 1);
                    setQuantity(Math.min(Math.max(1, remaining), requested));
                    setAdded(false);
                  }}
                  disabled={remaining === 0}
                  className={`${inputClass} max-w-[10rem]`}
                />
                <p className="mt-2 text-sm text-forest/60">
                  {remaining > 0 ? `${remaining} ${unitLabel} available${alreadyInCart > 0 ? ` · ${alreadyInCart} already in your cart` : ""}` : "You have added all currently available stock to your cart."}
                </p>
                <p className="mt-2 text-sm text-forest/60">
                  Estimated total:{" "}
                  <span className="font-semibold text-forest">Rs. {total.toLocaleString()}</span>
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={remaining === 0 || quantity > remaining}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-none border border-forest px-7 py-3.5 font-medium text-forest transition hover:bg-white"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add to cart
                </button>
                <button
                  type="button"
                  onClick={handleOrderNow}
                  disabled={remaining === 0 || quantity > remaining}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-none bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf"
                >
                  Order now
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {added && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-leaf/30 bg-sage/20 px-5 py-4 text-sm text-forest">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-leaf" />
                    Added to your cart
                  </span>
                  <span className="flex gap-4">
                    <Link href="/cart" className="font-medium underline">
                      View cart
                    </Link>
                    <Link href="/shop" className="underline">
                      Continue shopping
                    </Link>
                  </span>
                </div>
              )}

              <p className="text-center text-xs text-forest/50">
                No payment now. You send an order request from your cart and we&apos;ll
                contact you to confirm.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

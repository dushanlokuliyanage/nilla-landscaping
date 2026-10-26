"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Leaf, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";

const money = (amount: number) => `Rs. ${amount.toLocaleString()}`;

export default function CartDrawer() {
  const { items, count, total, isDrawerOpen, closeDrawer, setQuantity, removeItem } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeDrawer(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  useEffect(() => { closeDrawer(); }, [pathname, closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button type="button" aria-label="Close cart" onClick={closeDrawer} className="cart-drawer-backdrop absolute inset-0 h-full w-full cursor-default bg-forest/45" />
      <aside role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" className="cart-drawer-panel absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-forest/10 bg-cream shadow-2xl">
        <header className="flex items-start justify-between border-b border-forest/10 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-leaf">Your selection</p>
            <h2 id="cart-drawer-title" className="mt-1 font-display text-2xl font-semibold text-forest">Shopping cart <span className="font-sans text-sm font-normal text-forest/55">({count})</span></h2>
          </div>
          <button type="button" onClick={closeDrawer} aria-label="Close cart" className="border border-forest/15 p-2 text-forest/70 transition hover:bg-white"><X className="h-5 w-5" /></button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center border border-forest/10 bg-white text-leaf"><ShoppingBag className="h-6 w-6" /></span>
            <p className="mt-4 font-semibold text-forest">Your cart is empty</p>
            <p className="mt-1 text-sm text-forest/60">Add a product and it will show up here.</p>
            <Link href="/shop" onClick={closeDrawer} className="mt-5 bg-forest px-5 py-3 text-sm font-medium text-cream transition hover:bg-leaf">Browse products</Link>
          </div>
        ) : <>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {items.map((item) => {
              const otherProductQuantity = items.filter((other) => other.productId === item.productId && other.key !== item.key).reduce((sum, other) => sum + other.quantity, 0);
              const maxForLine = Math.max(0, item.stockQuantity - otherProductQuantity);
              const unitLabel = item.unit.replace(/^per\s+/i, "");
              return <article key={item.key} className="flex gap-3 border border-forest/10 bg-white p-3">
                <Link href={`/product?slug=${encodeURIComponent(item.slug)}`} onClick={closeDrawer} className="h-20 w-20 shrink-0 bg-sage/15">
                  {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center"><Leaf className="h-7 w-7 text-forest/20" /></span>}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><Link href={`/product?slug=${encodeURIComponent(item.slug)}`} onClick={closeDrawer} className="line-clamp-2 text-sm font-semibold text-forest hover:text-leaf">{item.name}</Link>
                      {Object.keys(item.options).length > 0 && <p className="mt-0.5 line-clamp-1 text-xs text-forest/55">{Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>}
                      <p className="mt-1 text-xs text-forest/55">{money(item.unitPrice)} {item.unit}</p></div>
                    <button type="button" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name}`} className="shrink-0 p-1 text-forest/40 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center border border-forest/15">
                      <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`} className="p-1.5 text-forest hover:bg-sage/15"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="min-w-8 px-1 text-center text-xs tabular-nums text-forest">{item.quantity}</span>
                      <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} disabled={item.quantity >= maxForLine} aria-label={`Increase ${item.name} quantity`} className="p-1.5 text-forest hover:bg-sage/15 disabled:cursor-not-allowed disabled:opacity-35"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="text-sm font-semibold text-forest">{money(item.unitPrice * item.quantity)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-forest/45">{item.stockQuantity} {unitLabel} in stock</p>
                </div>
              </article>;
            })}
          </div>

          <footer className="border-t border-forest/10 bg-white px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between"><span className="text-sm text-forest/65">Estimated total</span><span className="text-lg font-semibold text-forest">{money(total)}</span></div>
            <p className="mt-1 text-xs text-forest/50">Final quantities and availability are confirmed when we contact you.</p>
            <Link href="/cart" onClick={closeDrawer} className="mt-4 flex items-center justify-center gap-2 bg-forest px-5 py-3.5 text-sm font-medium text-cream transition hover:bg-leaf">Continue to checkout <ArrowRight className="h-4 w-4" /></Link>
            <button type="button" onClick={closeDrawer} className="mt-3 w-full py-2 text-sm font-medium text-forest/70 underline underline-offset-4 hover:text-leaf">Continue shopping</button>
          </footer>
        </>}
      </aside>
    </div>
  );
}

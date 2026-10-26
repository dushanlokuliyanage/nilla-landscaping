"use client";

import Link from "next/link";
import { Leaf, ArrowRight, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/api";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const productHref = `/product?slug=${encodeURIComponent(product.slug)}`;
  const hasOptions = product.options.length > 0;
  const alreadyInCart = items.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
  const remaining = Math.max(0, product.stockQuantity - alreadyInCart);
  const unitLabel = product.unit.replace(/^per\s+/i, "");

  function addToCart() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? null,
      unitPrice: product.price,
      unit: product.unit,
      quantity: 1,
      stockQuantity: product.stockQuantity,
      options: {},
    });
  }

  return (
    <article className="group flex flex-col overflow-hidden border border-forest/10 bg-white/60 transition hover:border-leaf/40 hover:bg-white">
      <Link href={productHref} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-sage/20">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Leaf className="h-10 w-10 text-forest/20" />
          </div>
        )}
        {(!product.inStock || product.stockQuantity <= 0) && (
          <span className="absolute left-3 top-3 rounded-none bg-white px-3 py-1 text-xs font-medium text-red-600">
            Out of stock
          </span>
        )}
        </div>

        <div className="p-5 pb-0">
          <h3 className="font-display text-lg font-semibold text-forest">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-forest/60">{product.description}</p>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-3 p-5">
        <div>
          <p className="font-medium text-leaf">Rs. {product.price.toLocaleString()} <span className="text-sm font-normal text-forest/50">{product.unit}</span></p>
          {product.stockQuantity > 0 && <p className="mt-1 text-xs text-forest/50">{remaining} {unitLabel} available to add</p>}
        </div>

        {product.inStock && product.stockQuantity > 0 && (hasOptions ? (
          <Link href={productHref} className="inline-flex shrink-0 items-center gap-1.5 bg-forest px-3.5 py-2 text-sm font-medium text-cream transition hover:bg-leaf">
            Choose options <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button type="button" onClick={addToCart} disabled={remaining === 0} className="inline-flex shrink-0 items-center gap-1.5 bg-forest px-3.5 py-2 text-sm font-medium text-cream transition hover:bg-leaf disabled:cursor-not-allowed disabled:bg-forest/40">
            <ShoppingBag className="h-4 w-4" /> {remaining > 0 ? "Add to cart" : "Stock in cart"}
          </button>
        ))}
      </div>
    </article>
  );
}

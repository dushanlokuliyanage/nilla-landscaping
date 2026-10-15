import Link from "next/link";
import { Leaf } from "lucide-react";
import type { Product } from "@/lib/api";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product?slug=${encodeURIComponent(product.slug)}`}
      className="group overflow-hidden rounded-none border border-forest/10 bg-white/60 transition hover:border-leaf/40 hover:bg-white"
    >
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
        {!product.inStock && (
          <span className="absolute left-3 top-3 rounded-none bg-white px-3 py-1 text-xs font-medium text-red-600">
            Out of stock
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-display text-lg font-semibold text-forest">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-forest/60">
          {product.description}
        </p>
        <p className="mt-3 font-medium text-leaf">
          Rs. {product.price.toLocaleString()}{" "}
          <span className="text-sm font-normal text-forest/50">{product.unit}</span>
        </p>
      </div>
    </Link>
  );
}

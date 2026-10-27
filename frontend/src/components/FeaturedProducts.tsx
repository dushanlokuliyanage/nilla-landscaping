"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getProducts, type Product } from "@/lib/api";

function SectionHeading() {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">
          From the Nilla shop
        </p>
        <h2 id="featured-products-title" className="mt-3 font-display text-3xl font-semibold tracking-tight text-forest sm:text-4xl md:text-5xl">
          A few things for your garden
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-forest/65 sm:text-base">
          Browse a small selection from our shop. Product details and availability are shown upfront.
        </p>
      </div>
      <Link
        href="/shop"
        className="group inline-flex w-fit shrink-0 items-center gap-2 border-b border-forest/25 pb-2 text-sm font-medium text-forest transition hover:border-leaf hover:text-leaf"
      >
        See all products
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden border border-forest/10 bg-white/60">
      <div className="aspect-[4/3] bg-sage/20" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 bg-sage/25" />
        <div className="h-3 w-full bg-sage/15" />
        <div className="h-3 w-4/5 bg-sage/15" />
        <div className="mt-5 h-9 w-32 bg-sage/20" />
      </div>
    </div>
  );
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    getProducts()
      .then((items) => setProducts(items.slice(0, 3)))
      .catch(() => setProducts([]));
  }, []);

  if (products?.length === 0) return null;

  return (
    <section aria-labelledby="featured-products-title" className="border-y border-forest/10 bg-sage/10 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <SectionHeading />
        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {products === null
            ? [0, 1, 2].map((item) => <ProductSkeleton key={item} />)
            : products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </div>
    </section>
  );
}

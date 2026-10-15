"use client";

import { useEffect, useState } from "react";
import { getProducts, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";

export default function ShopGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    getProducts()
      .then((data) => {
        setProducts(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") return <p className="text-forest/60">Loading products...</p>;
  if (status === "error")
    return <p className="text-red-600">Could not load products. Please try again.</p>;
  if (products.length === 0)
    return <p className="text-forest/60">No products yet. Please check back soon.</p>;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
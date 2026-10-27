"use client";

import { useEffect, useMemo, useState } from "react";
import { getProducts, type Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import Pagination from "@/components/Pagination";

export default function ShopGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("name");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    getProducts()
      .then((data) => {
        setProducts(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !query || [product.name, product.description, product.unit, ...product.options.flatMap((option) => [option.name, ...option.values])].some((value) => value.toLowerCase().includes(query));
      const matchesStock = stockFilter === "all" || (stockFilter === "in-stock" ? product.stockQuantity > 0 : product.stockQuantity <= 0);
      return matchesSearch && matchesStock;
    }).sort((a, b) => sortOrder === "price-low" ? a.price - b.price : sortOrder === "price-high" ? b.price - a.price : a.name.localeCompare(b.name));
  }, [products, search, stockFilter, sortOrder]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(visibleProducts.length / pageSize)));
  const pageProducts = visibleProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (status === "loading") return <p className="text-forest/60">Loading products...</p>;
  if (status === "error")
    return <p className="text-red-600">Could not load products. Please try again.</p>;
  if (products.length === 0)
    return <p className="text-forest/60">No products yet. Please check back soon.</p>;

  return (
    <div>
      <div className="mb-7 grid gap-3 border border-forest/10 bg-white/60 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <label className="sr-only" htmlFor="shop-search">Search products</label>
        <input id="shop-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products…" className="w-full border border-forest/15 bg-white px-4 py-3 text-sm text-forest outline-none focus:border-leaf" />
        <label className="sr-only" htmlFor="shop-stock-filter">Filter by availability</label>
        <select id="shop-stock-filter" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-3 text-sm text-forest"><option value="all">All availability</option><option value="in-stock">In stock</option><option value="out-of-stock">Out of stock</option></select>
        <label className="sr-only" htmlFor="shop-sort">Sort products</label>
        <select id="shop-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="border border-forest/15 bg-white px-3.5 py-3 text-sm text-forest"><option value="name">Name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
      </div>
      {visibleProducts.length === 0 ? <p className="border border-dashed border-forest/15 px-5 py-10 text-center text-forest/60">No products match your filters.</p> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {pageProducts.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
      </div>}
      <Pagination page={currentPage} pageSize={pageSize} total={visibleProducts.length} onChange={setPage} />
    </div>
  );
}

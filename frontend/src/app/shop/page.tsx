import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = {
  title: "Shop — Nilla Landscaping and Garden Service",
  description: "Browse our pebbles and send an order request.",
};

export default function ShopPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32">
        <span className="text-sm font-medium uppercase tracking-[0.18em] text-leaf">
          Our products
        </span>
        <h1 className="mt-3 font-display text-4xl font-semibold text-forest md:text-5xl">
    Stores
        </h1>
        <p className="mt-4 max-w-xl text-forest/70">
          Browse our pebbles. Choose what you like, send an order request, and
          we&apos;ll contact you to confirm.
        </p>

        <div className="mt-12">
          <ShopGrid />
        </div>
      </main>
      <Footer />
    </>
  );
}
import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductView from "@/components/ProductView";

export const metadata: Metadata = {
  title: "Product | Nilla Landscaping and Garden Service",
};

export default function ProductPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32">
        <Suspense fallback={<p className="text-forest/60">Loading...</p>}>
          <ProductView />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
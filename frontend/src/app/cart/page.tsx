import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartView from "@/components/CartView";

export const metadata: Metadata = {
  title: "Cart | Nilla Landscaping and Garden Service",

};

export default function CartPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-5 sm:pb-24 sm:pt-32">
        <h1 className="font-sans text-3xl font-light tracking-tight text-forest sm:text-4xl md:text-5xl">
    Cart
        </h1>
        <div className="mt-10">
          <CartView />
        </div>
      </main>
      <Footer />
    </>
  );
}

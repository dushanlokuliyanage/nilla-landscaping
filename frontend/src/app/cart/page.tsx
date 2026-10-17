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
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32">
        <h1 className="font-sans text-4xl font-light tracking-tight text-forest md:text-5xl">
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
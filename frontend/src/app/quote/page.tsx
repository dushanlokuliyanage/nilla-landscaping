import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import QuoteRequestForm from "@/components/QuoteRequestForm";

export const metadata: Metadata = { title: "Request a Quote | Nilla Garden", description: "Tell Nilla Garden about your landscaping project and request a quotation." };

export default function QuotePage() {
  return <><Navbar /><main className="mx-auto min-h-screen max-w-4xl px-5 pb-20 pt-28 sm:pt-36">
    <div className="mb-8 text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">Plan your project</p><h1 className="mt-2 font-display text-4xl text-forest sm:text-5xl">Request a Quote</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-forest/65">Tell us what you have in mind. We’ll review the project details and send you a quotation by email.</p></div>
    <div className="border border-forest/10 bg-white p-5 shadow-sm sm:p-8"><QuoteRequestForm /></div>
  </main><Footer /></>;
}

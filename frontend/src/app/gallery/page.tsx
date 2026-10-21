import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GalleryGrid from "@/components/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery | Nilla Landscaping and Garden Service",
  description: "See our completed landscaping and garden projects.",
};

export default function GalleryPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32">
        <span className="text-sm font-medium uppercase tracking-[0.18em] text-leaf">
          Our work
        </span>
        <h1 className="mt-3 font-display text-4xl font-semibold text-forest md:text-5xl">
          Gallery
        </h1>
        <p className="mt-4 max-w-xl text-forest/70">
          A look at some of our completed projects. Click a project to see more photos.
        </p>

        <div className="mt-12">
          <GalleryGrid />
        </div>

        <div className="mt-20 border border-forest/10 bg-white/60 p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-semibold text-forest md:text-3xl">
            Like what you see?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-forest/70">
            Tell us about your garden and we&apos;ll send you a free quote.
          </p>
          <Link
            href="/#contact"
            className="mt-6 inline-flex bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf"
          >
            Get a Free Quote
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
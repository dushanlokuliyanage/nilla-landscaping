import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Leaf } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20 md:pt-28 md:pb-28">
      <div className="absolute -top-24 -right-24 h-[28rem] w-[28rem] rounded-full bg-sage/40 blur-3xl" />
      <div className="absolute bottom-0 -left-24 h-[22rem] w-[22rem] rounded-full bg-earth/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-start gap-10 px-5 md:grid-cols-2 md:gap-14">
        <div className="pt-2 md:pt-0">
          <div className="mb-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-forest/55">
            <span className="text-leaf">Plan</span>
            <span aria-hidden="true" className="h-1 w-1 bg-earth" />
            <span className="text-leaf">Plant</span>
            <span aria-hidden="true" className="h-1 w-1 bg-earth" />
            <span className="text-leaf">Care</span>
            <span className="ml-1 hidden h-px flex-1 bg-forest/10 sm:block" />
          </div>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-forest md:text-6xl lg:text-7xl">
            Outdoor spaces that feel <span className="text-leaf">alive</span>.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-forest/70">
            Nilla Landscaping and Garden Service designs, builds and maintains
            beautiful gardens and lawns, so you can simply enjoy them.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf"
            >
              Get a Free Quote
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>

            <Link
              href="#services"
              className="inline-flex items-center rounded-full border border-forest/20 px-7 py-3.5 font-medium text-forest transition hover:bg-white"
            >
              Our Services
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden  shadow-2xl shadow-forest/30">
            <Image
              src="/images/hero.webp"
              alt="Beautifully landscaped garden"
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>

          <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl md:-left-8">
            <div>
              <p className="text-sm font-semibold text-forest">Free quote</p>
              <p className="text-xs text-forest/60">Tell us about your garden</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#services", label: "Services" },
  { href: "#why-us", label: "Why Us" },
  { href: "#process", label: "Process" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-cream/80 backdrop-blur-md border-b border-forest/10">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">
        <Link
          href="#"
          className="flex items-center gap-2 font-sans text-[1.35rem] font-medium tracking-tight text-forest"
        >
          <Image
            src="/images/sprout-logo.svg"
            alt=""
            width={36}
            height={36}
            priority
            className="w-9 h-9 shrink-0"
          />
            <span className="leading-none">
        <span className="block font-display text-xl font-semibold text-forest">
          Nilla
        </span>
        <span className="block mt-1 text-[10px] uppercase tracking-[0.18em] text-forest/60">
          Landscaping &amp; Garden (PVT) LTD
        </span>
      </span>
        </Link>

        <ul className="hidden md:flex items-center mb-2 gap-8 text-sm font-medium text-forest/80">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-leaf transition">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="#contact"
          className="hidden md:inline-flex bg-forest text-cream px-5 py-2  text-sm font-medium hover:bg-leaf transition"
        >
          Get a Quote
        </Link>

        <button
          className="md:hidden text-forest"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-cream border-t border-forest/10 px-5 py-4 space-y-4">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block text-forest font-medium"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="#contact"
            onClick={() => setOpen(false)}
            className="block text-center bg-forest text-cream px-5 py-2.5 rounded-full font-medium"
          >
            Get a Quote
          </Link>
        </div>
      )}
    </header>
  );
}

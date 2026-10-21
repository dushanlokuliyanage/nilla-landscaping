"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ShoppingBag } from "lucide-react";
import Logo from "@/components/Logo";
import { useCart } from "@/context/CartContext";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/shop", label: "Shop" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#process", label: "Process" },
  { href: "/#contact", label: "Contact" },
    { href: "/gallery", label: "Gallery" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-forest/10 bg-cream/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="Nilla home">
          <Logo />
        </Link>

        <ul className="mb-2 hidden items-center gap-8 text-sm font-medium text-forest/80 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="transition hover:text-leaf">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
            className="relative flex h-10 w-10 items-center justify-center text-forest transition hover:bg-white"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center bg-leaf px-1 text-[11px] font-medium text-cream">
                {count}
              </span>
            )}
          </Link>

          <Link
            href="/#contact"
            className="hidden bg-forest px-5 py-2 text-sm font-medium text-cream transition hover:bg-leaf md:inline-flex"
          >
            Get a Quote
          </Link>

          <button
            type="button"
            className="text-forest md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="space-y-4 border-t border-forest/10 bg-cream px-5 py-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block font-medium text-forest"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/#contact"
            onClick={() => setOpen(false)}
            className="block bg-forest px-5 py-2.5 text-center font-medium text-cream transition hover:bg-leaf"
          >
            Get a Quote
          </Link>
        </div>
      )}
    </header>
  );
}
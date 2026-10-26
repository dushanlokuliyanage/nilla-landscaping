import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Nilla Landscaping and Garden Service",
  description:
    "Professional lawn care, garden design and landscaping services.",
  icons: {
    icon: "/images/sprout-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${dmSans.variable}`}
    >
      <body className="antialiased">
        <CartProvider>{children}<CartDrawer /></CartProvider>
      </body>
    </html>
  );
}

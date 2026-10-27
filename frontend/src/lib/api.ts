const PRODUCTION_API_URL = "https://nilla-garden-backend.nilla-garden.workers.dev";
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

// `.env.local` is loaded during static production builds too. If it contains
// the local dev URL, use the deployed API in the exported site instead.
const API_URL =
  process.env.NODE_ENV === "production" &&
  (!configuredApiUrl || /^https?:\/\/localhost(?::\d+)?$/i.test(configuredApiUrl))
    ? PRODUCTION_API_URL
    : configuredApiUrl || PRODUCTION_API_URL;

export type ProductOption = { name: string; values: string[] };

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  unit: string;
  images: string[];
  options: ProductOption[];
  stockQuantity: number;
  inStock: boolean;
};

export type OrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  note?: string;
  items: {
    productId: number;
    quantity: number;
    options: Record<string, string>;
  }[];
};

export type QuoteService = "grass" | "interlock" | "plants" | "other";
export type QuoteRequestInput = {
  customerName: string;
  email: string;
  phone: string;
  address?: string;
  requestedServices: { service: QuoteService; description: string; quantity: number; unit: "sq ft" | "plant" | "job" }[];
  message?: string;
};

// Turns the API's validation errors into one readable message
async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  const e = body?.error;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    for (const [key, msgs] of Object.entries(e.fieldErrors ?? {})) {
      if (Array.isArray(msgs) && msgs[0]) return `${key}: ${msgs[0]}`;
    }
    if (e.formErrors?.[0]) return e.formErrors[0] as string;
  }
  return fallback;
}

export async function submitInquiry(data: {
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message: string;
}) {
  const res = await fetch(`${API_URL}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to submit inquiry"));
  return res.json();
}

export async function submitQuoteRequest(data: QuoteRequestInput) {
  const res = await fetch(`${API_URL}/api/quotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to send quote request"));
  return res.json() as Promise<{ success: boolean; id: number; quoteNumber: number }>;
}

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/products`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function getProduct(slug: string): Promise<Product | null> {
  const res = await fetch(`${API_URL}/api/products/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load product");
  return res.json();
}

export async function submitOrder(data: OrderInput) {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to send order request"));
  return res.json();
}

export type GalleryProject = {
  id: number;
  title: string;
  category: string;
  description: string;
  location: string | null;
  year: number | null;
  images: string[];
};

export async function getGalleryProjects(): Promise<GalleryProject[]> {
  const res = await fetch(`${API_URL}/api/gallery`);
  if (!res.ok) throw new Error("Failed to load gallery");
  return res.json();
}

export type Video = {
  id: number;
  title: string;
  category: string;
  videoUrl: string;
  posterUrl: string;
  orientation: "vertical" | "landscape";
};

export async function getVideos(): Promise<Video[]> {
  const res = await fetch(`${API_URL}/api/videos`);
  if (!res.ok) throw new Error("Failed to load videos");
  return res.json();
}


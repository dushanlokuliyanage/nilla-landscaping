const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  inStock: boolean;
};

export type OrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  address?: string;
  note?: string;
  items: {
    productId: number;
    quantity: number;
    options: Record<string, string>;
  }[];
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
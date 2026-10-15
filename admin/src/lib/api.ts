const API_URL = import.meta.env.VITE_API_URL;

export type Inquiry = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
};

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
  createdAt: string;
};

export type ProductInput = Omit<Product, "id" | "slug" | "createdAt">;

export type OrderItem = {
  productId: number;
  name: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  options: Record<string, string>;
};

export type OrderStatus = "new" | "contacted" | "completed" | "cancelled";

export type Order = {
  id: number;
  customerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  note: string | null;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
};

function getToken() {
  return localStorage.getItem("admin_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string"
        ? err.error
        : "Invalid data, please check the fields"
    );
  }

  return res.json();
}

// ---- auth ----
export async function login(email: string, password: string) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("admin_token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("admin_token");
}

export function isAuthenticated() {
  return !!getToken();
}

// ---- inquiries ----
export async function getInquiries(): Promise<Inquiry[]> {
  return request("/api/inquiries");
}

export async function markAsRead(id: number) {
  return request(`/api/inquiries/${id}/read`, { method: "PATCH" });
}

export async function deleteInquiry(id: number) {
  return request(`/api/inquiries/${id}`, { method: "DELETE" });
}

// ---- products ----
export async function getProducts(): Promise<Product[]> {
  return request("/api/products");
}

export async function createProduct(data: ProductInput): Promise<Product> {
  return request("/api/products", { method: "POST", body: JSON.stringify(data) });
}

export async function updateProduct(id: number, data: ProductInput): Promise<Product> {
  return request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteProduct(id: number) {
  return request(`/api/products/${id}`, { method: "DELETE" });
}

// ---- orders ----
export async function getOrders(): Promise<Order[]> {
  return request("/api/orders");
}

export async function updateOrderStatus(id: number, status: OrderStatus) {
  return request(`/api/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function deleteOrder(id: number) {
  return request(`/api/orders/${id}`, { method: "DELETE" });
}
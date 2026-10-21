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

export type AdminAccount = { id: number; email: string; role: "owner" | "manager" | "staff"; isActive: boolean; createdAt: string };
export type ActivityLog = { id: number; adminId: number | null; adminEmail: string; action: string; entity: string; entityId: string | null; details: Record<string, unknown>; createdAt: string };
export type AccessLog = { id: number; adminId: number | null; email: string; event: string; ipAddress: string | null; userAgent: string | null; createdAt: string };

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

export async function logoutWithLog() {
  try { await request("/api/auth/logout", { method: "POST" }); } finally { logout(); }
}

export function getCurrentAdmin(): Promise<{ id: number; email: string; role: AdminAccount["role"] }> {
  return request("/api/auth/me");
}

export function getTeam(): Promise<AdminAccount[]> { return request("/api/admin/team"); }
export function createTeamMember(data: { email: string; password: string; role: "manager" | "staff" }): Promise<AdminAccount> {
  return request("/api/admin/team", { method: "POST", body: JSON.stringify(data) });
}
export function updateTeamRole(id: number, role: "manager" | "staff") {
  return request(`/api/admin/team/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}
export function updateTeamStatus(id: number, isActive: boolean) {
  return request(`/api/admin/team/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) });
}
export function getActivityLogs(): Promise<ActivityLog[]> { return request("/api/admin/activity-logs"); }
export function getAccessLogs(): Promise<AccessLog[]> { return request("/api/admin/access-logs"); }

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

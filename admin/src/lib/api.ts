const PRODUCTION_API_URL = "https://nilla-garden-backend.nilla-garden.workers.dev";
const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const API_URL =
  import.meta.env.PROD &&
  (!configuredApiUrl || /^https?:\/\/localhost(?::\d+)?$/i.test(configuredApiUrl))
    ? PRODUCTION_API_URL
    : configuredApiUrl || PRODUCTION_API_URL;

export type Inquiry = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
  isRead: boolean;
  followUpStatus: "new" | "contacted" | "quoted" | "won" | "lost";
  followUpNote: string | null;
  createdAt: string;
};

export type QuoteService = "grass" | "interlock" | "plants" | "other";
export type QuoteRequest = {
  id: number;
  quoteNumber: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  requestedServices: { service: QuoteService; description: string; quantity: number; unit: string }[];
  message: string;
  quoteLines: { service: QuoteService | "transport"; description: string; quantity: number; unit: string; rate: number }[];
  total: number;
  status: "new" | "draft" | "sent" | "accepted" | "declined";
  validUntil: string | null;
  terms: string;
  warranty: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type QuoteRate = { key: QuoteService | "transport"; label: string; unit: string; rate: number; updatedAt: string };
export type QuoteLine = QuoteRequest["quoteLines"][number];
export type QuoteDistance = { origin: string; destination: string; distanceKm: number; ratePerKm: number; travelCharge: number };

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

export type AdminAccount = { id: number; email: string; role: string; isActive: boolean; createdAt: string };
export type AdminRole = { key: string; name: string; description: string; isActive: boolean; isSystem: boolean; permissions: string[]; createdAt: string; updatedAt: string };
export type ActivityLog = { id: number; adminId: number | null; adminEmail: string; action: string; entity: string; entityId: string | null; details: Record<string, unknown>; createdAt: string };
export type AccessLog = { id: number; adminId: number | null; email: string; event: string; ipAddress: string | null; userAgent: string | null; createdAt: string };

export type BackupDatasetName = "products" | "gallery" | "videos" | "inquiries" | "quotes" | "orders" | "logs";
export type SystemBackup = { application: "nilla-garden"; backupVersion: 1; createdAt: string; filters?: { from: string | null; to: string | null }; datasets: Record<string, unknown> };

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
export async function login(email: string, password: string, turnstileToken: string) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, turnstileToken }),
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

export function getCurrentAdmin(): Promise<{ id: number; email: string; role: string; permissions: string[] }> {
  return request("/api/auth/me");
}

export function getTeam(): Promise<AdminAccount[]> { return request("/api/admin/team"); }
export function createTeamMember(data: { email: string; password: string; role: string }): Promise<AdminAccount> {
  return request("/api/admin/team", { method: "POST", body: JSON.stringify(data) });
}
export function updateTeamRole(id: number, role: string) {
  return request(`/api/admin/team/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
}
export function getRoles(): Promise<AdminRole[]> { return request("/api/admin/roles"); }
export function createRole(data: Pick<AdminRole, "key" | "name" | "description" | "isActive" | "permissions">): Promise<AdminRole> {
  return request("/api/admin/roles", { method: "POST", body: JSON.stringify(data) });
}
export function updateRole(key: string, data: Pick<AdminRole, "name" | "description" | "isActive" | "permissions">): Promise<AdminRole> {
  return request(`/api/admin/roles/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify(data) });
}
export function deleteRole(key: string) {
  return request(`/api/admin/roles/${encodeURIComponent(key)}`, { method: "DELETE" });
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

export async function updateInquiryFollowUp(id: number, status: Inquiry["followUpStatus"], note: string) {
  return request(`/api/inquiries/${id}/follow-up`, {
    method: "PATCH",
    body: JSON.stringify({ status, note: note.trim() || null }),
  });
}

export async function deleteInquiry(id: number) {
  return request(`/api/inquiries/${id}`, { method: "DELETE" });
}

export function getQuoteRequests(): Promise<QuoteRequest[]> { return request("/api/quotes"); }
export function getQuoteRates(): Promise<QuoteRate[]> { return request("/api/quotes/rates"); }
export function calculateQuoteDistance(id: number): Promise<QuoteDistance> {
  return request(`/api/quotes/${id}/distance`, { method: "POST" });
}
export function saveQuoteRates(rates: { key: QuoteRate["key"]; rate: number }[]) {
  return request("/api/quotes/rates", { method: "PUT", body: JSON.stringify({ rates }) });
}
export function saveQuotation(id: number, data: { quoteLines: QuoteLine[]; validUntil: string | null; terms: string; warranty: string }): Promise<QuoteRequest> {
  return request(`/api/quotes/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export function sendQuotation(id: number): Promise<QuoteRequest> {
  return request(`/api/quotes/${id}/send`, { method: "POST" });
}
export function updateQuoteStatus(id: number, status: "accepted" | "declined"): Promise<QuoteRequest> {
  return request(`/api/quotes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
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

// ---- gallery ----
export type GalleryProject = {
  id: number;
  title: string;
  category: string;
  description: string;
  location: string | null;
  year: number | null;
  images: string[];
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
};

export type GalleryProjectInput = {
  title: string;
  category: string;
  description: string;
  location: string | null;
  year: number | null;
  images: string[];
  isPublished: boolean;
};

export async function getAllGalleryProjects(): Promise<GalleryProject[]> {
  return request("/api/gallery/all");
}

export async function createGalleryProject(data: GalleryProjectInput): Promise<GalleryProject> {
  return request("/api/gallery", { method: "POST", body: JSON.stringify(data) });
}

export async function updateGalleryProject(
  id: number,
  data: GalleryProjectInput
): Promise<GalleryProject> {
  return request(`/api/gallery/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function setGalleryPublished(id: number, isPublished: boolean) {
  return request(`/api/gallery/${id}/published`, {
    method: "PATCH",
    body: JSON.stringify({ isPublished }),
  });
}

export async function reorderGalleryProjects(ids: number[]) {
  return request("/api/gallery/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function deleteGalleryProject(id: number) {
  return request(`/api/gallery/${id}`, { method: "DELETE" });
}

// ---- videos ----
export type VideoItem = {
  id: number;
  title: string;
  category: string;
  videoUrl: string;
  posterUrl: string;
  orientation: "vertical" | "landscape";
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
};

export type VideoInput = {
  title: string;
  category: string;
  videoUrl: string;
  posterUrl: string;
  orientation: "vertical" | "landscape";
  isPublished: boolean;
};

export async function getAllVideos(): Promise<VideoItem[]> {
  return request("/api/videos/all");
}

export async function createVideo(data: VideoInput): Promise<VideoItem> {
  return request("/api/videos", { method: "POST", body: JSON.stringify(data) });
}

export async function updateVideo(id: number, data: VideoInput): Promise<VideoItem> {
  return request(`/api/videos/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function setVideoPublished(id: number, isPublished: boolean) {
  return request(`/api/videos/${id}/published`, {
    method: "PATCH",
    body: JSON.stringify({ isPublished }),
  });
}

export async function reorderVideos(ids: number[]) {
  return request("/api/videos/reorder", { method: "POST", body: JSON.stringify({ ids }) });
}

export async function deleteVideo(id: number) {
  return request(`/api/videos/${id}`, { method: "DELETE" });
}

export function createSystemBackup(options: { datasets: BackupDatasetName[]; from?: string; to?: string }): Promise<SystemBackup> {
  const params = new URLSearchParams({ datasets: options.datasets.join(",") });
  if (options.from) params.set("from", options.from);
  if (options.to) params.set("to", options.to);
  return request(`/api/admin/backup?${params.toString()}`);
}

export function restoreSystemBackup(backup: SystemBackup, datasets: BackupDatasetName[]) {
  return request("/api/admin/backup/restore", { method: "POST", body: JSON.stringify({ backup, datasets, replace: true }) });
}

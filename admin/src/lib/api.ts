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
    throw new Error(err.error ?? "Request failed");
  }

  return res.json();
}

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

export async function getInquiries(): Promise<Inquiry[]> {
  return request("/api/inquiries");
}

export async function markAsRead(id: number) {
  return request(`/api/inquiries/${id}/read`, { method: "PATCH" });
}

export async function deleteInquiry(id: number) {
  return request(`/api/inquiries/${id}`, { method: "DELETE" });
}
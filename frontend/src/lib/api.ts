const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.formErrors?.[0] ?? "Failed to submit inquiry");
  }

  return res.json();
}
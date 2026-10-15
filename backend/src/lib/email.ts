import { Resend } from "resend";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export async function sendInquiryNotification(
  inquiry: {
    name: string;
    email: string;
    phone?: string | null;
    service?: string | null;
    message: string;
  },
  env: { RESEND_API_KEY: string; ADMIN_EMAIL: string }
) {
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: env.ADMIN_EMAIL,
    subject: `New inquiry from ${inquiry.name}`,
    html: `
      <h2>New Inquiry — Nilla Garden</h2>
      <p><strong>Name:</strong> ${esc(inquiry.name)}</p>
      <p><strong>Email:</strong> ${esc(inquiry.email)}</p>
      <p><strong>Phone:</strong> ${esc(inquiry.phone ?? "-")}</p>
      <p><strong>Service:</strong> ${esc(inquiry.service ?? "-")}</p>
      <p><strong>Message:</strong><br/>${esc(inquiry.message)}</p>
    `,
  });
}

export async function sendCustomerConfirmation(
  inquiry: { name: string; email: string },
  env: { RESEND_API_KEY: string }
) {
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: inquiry.email,
    subject: "We received your inquiry — Nilla Garden",
    html: `
      <p>Hi ${esc(inquiry.name)},</p>
      <p>Thanks for reaching out to Nilla Garden Service and Landscaping. We've received your message and will get back to you shortly.</p>
      <p>— Nilla Garden Team</p>
    `,
  });
}

export async function sendOrderNotification(
  order: {
    id: number;
    customerName: string;
    phone: string;
    email: string | null;
    address: string | null;
    note: string | null;
    items: {
      name: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      options: Record<string, string>;
    }[];
  },
  env: { RESEND_API_KEY: string; ADMIN_EMAIL: string }
) {
  const resend = new Resend(env.RESEND_API_KEY);

  const total = order.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const rows = order.items
    .map((i) => {
      const opts = Object.entries(i.options)
        .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
        .join(", ");
      return `<li><strong>${esc(i.name)}</strong> — ${i.quantity} (${esc(i.unit)}) @ Rs. ${i.unitPrice}${opts ? `<br/><small>${opts}</small>` : ""}</li>`;
    })
    .join("");

  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: env.ADMIN_EMAIL,
    subject: `New order request #${order.id} from ${order.customerName}`,
    html: `
      <h2>New Order Request #${order.id}</h2>
      <p><strong>Name:</strong> ${esc(order.customerName)}</p>
      <p><strong>Phone:</strong> ${esc(order.phone)}</p>
      <p><strong>Email:</strong> ${esc(order.email ?? "-")}</p>
      <p><strong>Address:</strong> ${esc(order.address ?? "-")}</p>
      <p><strong>Note:</strong> ${esc(order.note ?? "-")}</p>
      <h3>Items</h3>
      <ul>${rows}</ul>
      <p><strong>Estimated total:</strong> Rs. ${total}</p>
    `,
  });
}
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

type QuoteRequestEmail = {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  message: string;
  requestedServices: { service: string; description: string; quantity: number; unit: string }[];
};

export async function sendQuoteRequestNotification(request: QuoteRequestEmail, env: { RESEND_API_KEY: string; ADMIN_EMAIL: string }) {
  const lines = request.requestedServices.map((line) => `<li>${esc(line.description)} — ${line.quantity} ${esc(line.unit)}</li>`).join("");
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: env.ADMIN_EMAIL,
    subject: `New quote request #${request.id + 1350} from ${request.customerName}`,
    html: `<h2>New quote request #${request.id + 1350}</h2><p><strong>Name:</strong> ${esc(request.customerName)}</p><p><strong>Email:</strong> ${esc(request.email)}</p><p><strong>Phone:</strong> ${esc(request.phone)}</p><p><strong>Address:</strong> ${esc(request.address || "-")}</p><h3>Requested work</h3><ul>${lines}</ul><p><strong>Message:</strong><br/>${esc(request.message || "-")}</p>`,
  });
}

export async function sendQuoteReceivedConfirmation(request: Pick<QuoteRequestEmail, "customerName" | "email">, env: { RESEND_API_KEY: string }) {
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: request.email,
    subject: "We received your quote request — Nilla Garden",
    html: `<p>Hi ${esc(request.customerName)},</p><p>Thank you for requesting a quotation from Nilla Garden Service and Landscaping Company. We have received your project details and will review them before sending a quotation.</p><p>— Nilla Garden Team</p>`,
  });
}

export async function sendCustomerQuote(quote: {
  quoteNumber: number;
  customerName: string;
  email: string;
  quoteLines: { description: string; quantity: number; unit: string; rate: number }[];
  total: number;
  validUntil: string | null;
  terms: string;
  warranty: string;
}, env: { RESEND_API_KEY: string }) {
  const rows = quote.quoteLines.map((line) => `<tr><td style="padding:8px;border-bottom:1px solid #ddd">${esc(line.description)}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:center">${line.quantity} ${esc(line.unit)}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">Rs. ${line.rate.toLocaleString("en-LK")}</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">Rs. ${(line.quantity * line.rate).toLocaleString("en-LK")}</td></tr>`).join("");
  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: quote.email,
    subject: `Quotation #${quote.quoteNumber} — Nilla Garden Service and Landscaping Company`,
    html: `<div style="font-family:Arial,sans-serif;color:#1d2b20;max-width:760px"><p style="text-align:center;color:#4d80bd;font-size:26px;font-family:Georgia,serif"><strong>SAMANTHA ENTERPRISES</strong><br/><span style="font-size:13px">Government &amp; Private Civil Contractor, Gardening Works and Land Reclamation and Filling</span><br/><span style="font-size:13px">Provincial Council Reg: W/15616 | CIDA Reg: 17743 | SLIER DC No: RR00094233</span></p><hr/><h2 style="color:#159447">Nilla Garden Service and Landscaping Company</h2><p>Quotation No: ${quote.quoteNumber}</p><p>Date: ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo" }).format(new Date())}</p><p>Dear ${esc(quote.customerName)}, thank you for considering our company for your gardening needs. Please find your quotation below.</p><table style="border-collapse:collapse;width:100%"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #444">Description</th><th style="padding:8px;border-bottom:1px solid #444">Qty</th><th style="text-align:right;padding:8px;border-bottom:1px solid #444">Rate</th><th style="text-align:right;padding:8px;border-bottom:1px solid #444">Amount</th></tr></thead><tbody>${rows}</tbody></table><h3 style="text-align:right">Total Amount Payable: Rs. ${quote.total.toLocaleString("en-LK")}/-</h3><p><strong>Terms and Conditions:</strong><br/>${esc(quote.terms)}<br/>${esc(quote.warranty)}${quote.validUntil ? `<br/>Valid until: ${esc(quote.validUntil)}` : ""}</p></div>`,
  });
}

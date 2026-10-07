import { Resend } from "resend";
import "dotenv/config";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendInquiryNotification(inquiry: {
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message: string;
}) {
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>", // swap once your domain is verified in Resend
    to: process.env.ADMIN_EMAIL!,
    subject: `New inquiry from ${inquiry.name}`,
    html: `
      <h2>New Inquiry — Nilla Garden</h2>
      <p><strong>Name:</strong> ${inquiry.name}</p>
      <p><strong>Email:</strong> ${inquiry.email}</p>
      <p><strong>Phone:</strong> ${inquiry.phone ?? "-"}</p>
      <p><strong>Service:</strong> ${inquiry.service ?? "-"}</p>
      <p><strong>Message:</strong><br/>${inquiry.message}</p>
    `,
  });
}

export async function sendCustomerConfirmation(inquiry: { name: string; email: string }) {
  await resend.emails.send({
    from: "Nilla Garden <onboarding@resend.dev>",
    to: inquiry.email,
    subject: "We received your inquiry — Nilla Garden",
    html: `
      <p>Hi ${inquiry.name},</p>
      <p>Thanks for reaching out to Nilla Garden Service and Landscaping. We've received your message and will get back to you shortly.</p>
      <p>— Nilla Garden Team</p>
    `,
  });
}
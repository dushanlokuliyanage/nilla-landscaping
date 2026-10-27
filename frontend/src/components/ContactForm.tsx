"use client";

import { useState } from "react";
import { submitInquiry } from "@/lib/api";
import { inquiryFormSchema, validationMessage } from "@/lib/validation";
import { Send } from "lucide-react";
import Turnstile from "@/components/Turnstile";

const SERVICES = ["Lawn Care", "Garden Design", "Tree Trimming", "Irrigation", "Landscaping", "Maintenance", "Other"];

export default function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: SERVICES[0],
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = inquiryFormSchema.safeParse(form);
    if (!parsed.success) {
      setStatus("error");
      setErrorMsg(validationMessage(parsed.error));
      return;
    }
    if (!turnstileToken) { setStatus("error"); setErrorMsg("Please complete the security check."); return; }
    setStatus("loading");
    setErrorMsg("");
    try {
      await submitInquiry({ ...parsed.data, turnstileToken });
      setTurnstileToken("");
      setStatus("success");
      setForm({ name: "", email: "", phone: "", service: SERVICES[0], message: "" });
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setTurnstileToken("");
      setTurnstileKey((key) => key + 1);
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-leaf/30 bg-sage/20 p-5 text-forest sm:p-8">
        <p className="font-display text-xl font-semibold">Thank you!</p>
        <p className="mt-2 text-sm text-forest/70">
          We&apos;ve received your inquiry and will get back to you soon.
        </p>
      </div>
    );
  }

  const inputClass = "w-full rounded-xl border border-forest/15 bg-white px-4 py-3 text-forest placeholder:text-forest/40 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-forest">Name</label>
          <input
            required
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-forest">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-forest">Phone (optional)</label>
          <input
            placeholder="07X XXX XXXX"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-forest">Service</label>
          <select
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
            className={inputClass}
          >
            {SERVICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-forest">Message</label>
        <textarea
          required
          rows={4}
          placeholder="Tell us about your garden..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={inputClass}
        />
      </div>

      {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}

      <Turnstile key={turnstileKey} onToken={setTurnstileToken} />

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center gap-2  bg-forest px-7 py-3.5 font-medium text-cream transition hover:bg-leaf disabled:opacity-50"
      >
        {status === "loading" ? "Sending..." : "Send Inquiry"}
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { submitQuoteRequest, type QuoteRequestInput, type QuoteService } from "@/lib/api";
import Turnstile from "@/components/Turnstile";

const inputClass = "w-full border border-forest/15 bg-white px-4 py-3 text-sm text-forest placeholder:text-forest/40 outline-none transition focus:border-leaf focus:ring-2 focus:ring-leaf/20";
const serviceOptions: { key: QuoteService; label: string; detail: string }[] = [
  { key: "grass", label: "Grass", detail: "Supply and installation" },
  { key: "interlock", label: "Interlock paving", detail: "Paving and installation" },
  { key: "plants", label: "Plants", detail: "Plant supply and planting" },
  { key: "other", label: "Other garden work", detail: "Describe the work below" },
];

export default function QuoteRequestForm() {
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selected, setSelected] = useState<QuoteService[]>([]);
  const [areas, setAreas] = useState({ grass: "", interlock: "", plants: "", other: "" });
  const [otherDescription, setOtherDescription] = useState("");
  const [plantDetails, setPlantDetails] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  function toggleService(key: QuoteService) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (customerName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !/^[+()\d\s.-]{7,40}$/.test(phone.trim()) || address.trim().length < 2) {
      setStatus("error"); setError("Enter your name, a valid email and phone number, and the project location."); return;
    }
    if (!selected.length) { setStatus("error"); setError("Choose at least one type of work."); return; }
    if (!turnstileToken) { setStatus("error"); setError("Please complete the security check."); return; }
    const requestedServices: QuoteRequestInput["requestedServices"] = [];
    for (const key of selected) {
      const qty = key === "other" ? 1 : Number(areas[key]);
      if (key !== "other" && (!Number.isInteger(qty) || qty <= 0)) {
        setStatus("error");
        setError(`Enter a whole-number ${key === "grass" || key === "interlock" ? "square-foot area" : "quantity"} for ${serviceOptions.find((item) => item.key === key)?.label}.`);
        return;
      }
      requestedServices.push({
        service: key,
        description: key === "grass" ? "Grass supply and installation" : key === "interlock" ? "Interlock paving" : key === "plants" ? `Plants${plantDetails.trim() ? ` — ${plantDetails.trim()}` : ""}` : otherDescription.trim(),
        quantity: qty,
        unit: key === "grass" || key === "interlock" ? "sq ft" : key === "plants" ? "plant" : "job",
      });
      if (key === "other" && !otherDescription.trim()) { setStatus("error"); setError("Describe the other garden work you need."); return; }
    }
    setStatus("sending"); setError("");
    try {
      await submitQuoteRequest({ customerName, email, phone, address, requestedServices, message, turnstileToken });
      setStatus("sent");
    } catch (reason) {
      setStatus("error"); setError(reason instanceof Error ? reason.message : "Could not send your quote request. Please try again."); setTurnstileToken(""); setTurnstileKey((key) => key + 1);
    }
  }

  if (status === "sent") return <div className="border border-leaf/20 bg-white p-8 text-center shadow-sm sm:p-12"><CheckCircle2 className="mx-auto h-12 w-12 text-leaf" /><h2 className="mt-4 font-display text-2xl text-forest">Quote request received</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-forest/65">Thank you, {customerName}. We’ll review the project details and email your quotation after checking the work and pricing.</p></div>;

  return <form onSubmit={(event) => void submit(event)} className="space-y-8">
    <section><h2 className="text-lg font-semibold text-forest">Your contact details</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium text-forest">Full name *<input required minLength={2} maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={`${inputClass} mt-1.5`} autoComplete="name" /></label>
      <label className="text-sm font-medium text-forest">Email *<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mt-1.5`} autoComplete="email" /></label>
      <label className="text-sm font-medium text-forest">Phone number *<input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} mt-1.5`} autoComplete="tel" /></label>
      <label className="text-sm font-medium text-forest">Project location *<input required minLength={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Town or area" className={`${inputClass} mt-1.5`} autoComplete="street-address" /><span className="mt-1 block text-xs font-normal text-forest/50">We use this location to estimate one-way driving distance from Hanwella for your quotation.</span></label>
    </div></section>
    <section><h2 className="text-lg font-semibold text-forest">What work do you need?</h2><p className="mt-1 text-sm text-forest/60">Choose every service you want included in the quotation.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{serviceOptions.map((option) => <label key={option.key} className={`flex cursor-pointer items-start gap-3 border p-4 transition ${selected.includes(option.key) ? "border-leaf bg-sage/15" : "border-forest/10 bg-white hover:border-leaf/40"}`}><input type="checkbox" checked={selected.includes(option.key)} onChange={() => toggleService(option.key)} className="mt-1 h-4 w-4 accent-[#2f6b3a]" /><span><span className="block text-sm font-semibold text-forest">{option.label}</span><span className="mt-0.5 block text-xs text-forest/55">{option.detail}</span></span></label>)}</div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{selected.filter((key) => key !== "plants").map((key) => <label key={key} className="text-sm font-medium text-forest">{key === "grass" ? "Grass area (sq ft) *" : key === "interlock" ? "Interlock area (sq ft) *" : "Describe other work *"}<input type={key === "other" ? "text" : "number"} min={key === "other" ? undefined : 1} step={key === "other" ? undefined : 1} value={key === "other" ? otherDescription : areas[key]} onChange={(e) => key === "other" ? setOtherDescription(e.target.value) : setAreas({ ...areas, [key]: e.target.value })} className={`${inputClass} mt-1.5`} placeholder={key === "other" ? "e.g. garden cleanup" : "Enter approximate square feet"} /></label>)}
        {selected.includes("plants") && <><label className="text-sm font-medium text-forest">Number of plants *<input type="number" min={1} step={1} value={areas.plants} onChange={(e) => setAreas({ ...areas, plants: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="Approximate quantity" /></label><label className="text-sm font-medium text-forest">Plant types or sizes<input value={plantDetails} onChange={(e) => setPlantDetails(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="e.g. areca palms, flowering plants" /></label></>}
      </div>
    </section>
    <section><label className="text-sm font-medium text-forest">Anything else we should know?<textarea rows={4} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} mt-1.5 resize-y`} placeholder="Share measurements, access details, preferences, or any questions." /></label></section>
    <Turnstile key={turnstileKey} onToken={setTurnstileToken} />
    {status === "error" && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={status === "sending"} className="inline-flex items-center gap-2 bg-forest px-6 py-3 text-sm font-medium text-cream transition hover:bg-leaf disabled:opacity-50">{status === "sending" ? "Sending request…" : "Request my quotation"}<ArrowRight className="h-4 w-4" /></button>
  </form>;
}

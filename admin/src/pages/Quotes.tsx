import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Plus, Save, Send, Settings2, Trash2 } from "lucide-react";
import { calculateQuoteDistance, getQuoteRates, getQuoteRequests, saveQuoteRates, saveQuotation, sendQuotation, updateQuoteStatus, type QuoteLine, type QuoteRate, type QuoteRequest } from "@/lib/api";

const rateDefinitions: { key: QuoteRate["key"]; label: string; unit: string }[] = [
  { key: "grass", label: "Grass supply and installation", unit: "sq ft" },
  { key: "interlock", label: "Interlock paving", unit: "sq ft" },
  { key: "plants", label: "Plants", unit: "plant" },
  { key: "other", label: "Other works", unit: "job" },
  { key: "transport", label: "Transportation", unit: "km" },
];
const money = (value: number) => `Rs. ${Math.round(value).toLocaleString("en-LK")}/-`;
function defaultValidity() { const date = new Date(); date.setDate(date.getDate() + 60); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function dateLabel(value: string | null) { if (!value) return "—"; const [year, month, day] = value.slice(0, 10).split("-"); return `${day}/${month}/${year}`; }

export default function Quotes() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [rates, setRates] = useState<QuoteRate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [validUntil, setValidUntil] = useState(defaultValidity());
  const [terms, setTerms] = useState("Quotation is valid for 60 days.");
  const [warranty, setWarranty] = useState("This project is covered by a 1-year warranty.");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [distanceMessage, setDistanceMessage] = useState("");
  const latestDistanceRequest = useRef(0);
  const distanceCache = useRef(new Map<number, { distanceKm: number; ratePerKm: number }>());

  async function load() {
    setLoading(true);
    try {
      const [quoteRows, rateRows] = await Promise.all([getQuoteRequests(), getQuoteRates()]);
      setRequests(quoteRows); setRates(rateRows); setError("");
      if (selectedId && !quoteRows.some((item) => item.id === selectedId)) setSelectedId(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load quote requests"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const selected = requests.find((item) => item.id === selectedId) ?? null;
  const total = useMemo(() => lines.reduce((sum, line) => sum + Math.round(line.quantity * line.rate), 0), [lines]);

  async function openRequest(item: QuoteRequest) {
    const requestNumber = ++latestDistanceRequest.current;
    setSelectedId(item.id); setError(""); setNotice("");
    setDistanceMessage("");
    const rateMap = new Map(rates.map((rate) => [rate.key, rate.rate]));
    const prepared = item.quoteLines.length ? item.quoteLines : [
      ...item.requestedServices.map((service) => ({ service: service.service, description: service.description, quantity: service.quantity, unit: service.unit, rate: rateMap.get(service.service) ?? 0 })),
      { service: "transport" as const, description: `Transportation from Hanwella to ${item.address}`, quantity: 0, unit: "km", rate: rateMap.get("transport") ?? 300 },
    ];
    setLines(prepared.map((line) => ({ ...line })));
    setValidUntil(item.validUntil ?? defaultValidity());
    setTerms(item.terms || "Quotation is valid for 60 days.");
    setWarranty(item.warranty || "This project is covered by a 1-year warranty.");
    if (item.quoteLines.some((line) => line.service === "transport" && line.quantity > 0)) {
      const distance = item.quoteLines.find((line) => line.service === "transport")?.quantity;
      setDistanceMessage(distance ? `Saved driving distance: ${distance} km. You can adjust it if needed.` : "");
      return;
    }
    if (!item.address) { setDistanceMessage("Add a project location to calculate the driving distance."); return; }
    const cached = distanceCache.current.get(item.id);
    if (cached) {
      setLines((current) => current.map((line) => line.service === "transport" ? { ...line, quantity: cached.distanceKm, rate: cached.ratePerKm } : line));
      setDistanceMessage(`One-way driving distance: ${cached.distanceKm} km · ${money(cached.distanceKm * cached.ratePerKm)} at Rs. ${cached.ratePerKm}/km.`);
      return;
    }
    setDistanceMessage("Calculating driving distance from Hanwella with Google Maps…");
    try {
      const distance = await calculateQuoteDistance(item.id);
      if (requestNumber !== latestDistanceRequest.current) return;
      distanceCache.current.set(item.id, distance);
      setLines((current) => current.map((line) => line.service === "transport" ? { ...line, quantity: distance.distanceKm, rate: distance.ratePerKm } : line));
      setDistanceMessage(`One-way driving distance: ${distance.distanceKm} km · ${money(distance.travelCharge)} at Rs. ${distance.ratePerKm}/km. Adjust the distance if you want to include a return trip or site access.`);
    } catch (reason) {
      if (requestNumber !== latestDistanceRequest.current) return;
      setDistanceMessage(`${reason instanceof Error ? reason.message : "Route could not be calculated."} Enter the driving distance (km) in the transportation line. Verify it in Google Maps.`);
    }
  }

  function updateLine(index: number, changes: Partial<QuoteLine>) { setLines((current) => current.map((line, i) => i === index ? { ...line, ...changes } : line)); }
  function addLine() { setLines((current) => [...current, { service: "other", description: "Additional work", quantity: 1, unit: "job", rate: rates.find((rate) => rate.key === "other")?.rate ?? 0 }]); }

  async function persistDraft() {
    if (!selected) return null;
    setSaving(true); setError(""); setNotice("");
    try {
      const updated = await saveQuotation(selected.id, { quoteLines: lines, validUntil: validUntil || null, terms, warranty });
      setRequests((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice("Quotation draft saved.");
      return updated;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save quotation"); return null; }
    finally { setSaving(false); }
  }

  async function sendQuote() {
    if (!selected) return;
    const saved = await persistDraft();
    if (!saved) return;
    setSaving(true); setError("");
    try {
      const sent = await sendQuotation(saved.id);
      setRequests((current) => current.map((item) => item.id === sent.id ? sent : item));
      setNotice(`Quotation #${sent.quoteNumber} sent to ${sent.email}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to send quotation"); }
    finally { setSaving(false); }
  }

  async function saveRates() {
    setSaving(true); setError(""); setNotice("");
    try {
      const updated = await saveQuoteRates(rateDefinitions.map(({ key }) => ({ key, rate: Number(rates.find((rate) => rate.key === key)?.rate ?? (key === "transport" ? 300 : 0)) })));
      setRates(updated); setNotice("Unit prices saved. These prices will be used for new quotation drafts.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save unit prices"); }
    finally { setSaving(false); }
  }

  async function closeQuote(status: "accepted" | "declined") {
    if (!selected) return;
    setSaving(true); setError("");
    try { const updated = await updateQuoteStatus(selected.id, status); setRequests((current) => current.map((item) => item.id === updated.id ? updated : item)); setNotice(`Quote marked ${status}.`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update quote status"); }
    finally { setSaving(false); }
  }

  return <div className="min-h-screen quote-admin-page"><div className="admin-main"><main className="mx-auto max-w-7xl px-5 py-8">
    <div className="mb-6"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-leaf">Sales workspace</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-forest">Generate Quote</h1><p className="mt-1.5 text-sm text-forest/60">Review customer requests, set your unit prices, and prepare a quotation for approval.</p></div>
    {error && <p role="alert" className="mb-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mb-4 border border-leaf/20 bg-sage/15 p-3 text-sm text-forest">{notice}</p>}

    <section className="mb-6 border border-forest/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold text-forest"><Settings2 className="h-4 w-4" /> Default unit prices</h2><p className="mt-1 text-xs text-forest/55">Prices start at zero. Set and save current rates; each quote keeps its own price snapshot.</p></div><button type="button" onClick={() => void saveRates()} disabled={saving} className="inline-flex items-center gap-2 border border-forest/15 px-3 py-2 text-sm text-forest hover:bg-sage/10 disabled:opacity-50"><Save className="h-4 w-4" /> Save prices</button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{rateDefinitions.map((definition) => <label key={definition.key} className="text-xs font-medium text-forest/70">{definition.label} (Rs. / {definition.unit})<input type="number" min={0} step={1} value={rates.find((rate) => rate.key === definition.key)?.rate ?? (definition.key === "transport" ? 300 : 0)} onChange={(event) => setRates((current) => current.map((rate) => rate.key === definition.key ? { ...rate, rate: Number(event.target.value) } : rate))} className="mt-1.5 block w-full border border-forest/15 px-3 py-2 text-sm text-forest" /></label>)}</div><p className="mt-2 text-xs text-forest/50">Transportation uses the saved rate per km and one-way driving distance from Hanwella. If Maps can’t find the location, enter the km manually in the quote line.</p>
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="border border-forest/10 bg-white shadow-sm"><div className="border-b border-forest/10 p-4"><h2 className="font-semibold text-forest">Quote requests</h2><p className="mt-1 text-xs text-forest/55">{requests.length} total · newest first</p></div><div className="max-h-[70vh] overflow-y-auto">
        {loading ? <p className="p-5 text-sm text-forest/55">Loading quote requests…</p> : requests.length === 0 ? <p className="p-5 text-sm text-forest/55">No quote requests yet.</p> : requests.map((item) => <button key={item.id} type="button" onClick={() => openRequest(item)} className={`block w-full border-b border-forest/5 p-4 text-left transition hover:bg-sage/10 ${selectedId === item.id ? "bg-sage/15" : ""}`}><span className="flex items-center justify-between gap-2"><span className="truncate font-medium text-forest">{item.customerName}</span><span className="shrink-0 text-[10px] uppercase text-leaf">{item.status}</span></span><span className="mt-1 block truncate text-xs text-forest/55">Quote #{item.quoteNumber} · {item.email}</span><span className="mt-1 block text-[11px] text-forest/45">{new Date(item.createdAt).toLocaleDateString()}</span></button>)}</div></section>

      {selected ? <section className="quote-editor border border-forest/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-forest/10 pb-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-leaf">Quote #{selected.quoteNumber} · {selected.status}</p><h2 className="mt-1 text-xl font-semibold text-forest">{selected.customerName}</h2><p className="mt-1 text-sm text-forest/60">{selected.email} · {selected.phone}</p>{selected.address && <p className="mt-1 text-sm text-forest/60">{selected.address}</p>}</div><button type="button" onClick={() => window.print()} className="quote-controls inline-flex items-center gap-2 border border-forest/15 px-3 py-2 text-sm text-forest hover:bg-sage/10"><Download className="h-4 w-4" /> PDF preview</button></div>
        <div className="my-4 bg-sage/10 p-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-forest/65">Customer request</h3><ul className="mt-2 space-y-1 text-sm text-forest">{selected.requestedServices.map((item, index) => <li key={index}>• {item.description} — {item.quantity.toLocaleString()} {item.unit}</li>)}</ul>{selected.message && <p className="mt-2 whitespace-pre-wrap text-sm text-forest/65">{selected.message}</p>}</div>
        <p role="status" className="mb-3 text-xs text-forest/60">{distanceMessage}</p>

        <div className="quote-controls mb-3 flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold text-forest">Quotation items</h3><p className="mt-1 text-xs text-forest/55">Edit quantities and rates. Amounts are calculated automatically.</p></div><button type="button" onClick={addLine} className="inline-flex items-center gap-1 border border-forest/15 px-3 py-2 text-xs text-forest hover:bg-sage/10"><Plus className="h-3.5 w-3.5" /> Add line</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-sage/15 text-xs text-forest/65"><tr><th className="p-2.5">Description</th><th className="p-2.5">Qty</th><th className="p-2.5">Unit</th><th className="p-2.5">Rate (Rs.)</th><th className="p-2.5 text-right">Amount</th><th className="quote-controls p-2.5" /></tr></thead><tbody>{lines.map((line, index) => <tr key={index} className="border-b border-forest/5"><td className="p-2"><input aria-label="Line description" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} className="w-full min-w-40 border border-forest/10 px-2 py-1.5" /></td><td className="p-2"><input aria-label="Quantity" type="number" min={0} step="any" value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} className="w-24 border border-forest/10 px-2 py-1.5" /></td><td className="p-2"><input aria-label="Unit" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} className="w-20 border border-forest/10 px-2 py-1.5" /></td><td className="p-2"><input aria-label="Rate" type="number" min={0} step={1} value={line.rate} onChange={(e) => updateLine(index, { rate: Number(e.target.value) })} className="w-28 border border-forest/10 px-2 py-1.5" /></td><td className="p-2 text-right font-medium">{money(line.quantity * line.rate)}</td><td className="quote-controls p-2"><button type="button" aria-label={`Remove ${line.description}`} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody><tfoot><tr><td className="p-3 font-semibold text-forest" colSpan={4}>Total Amount Payable</td><td className="p-3 text-right text-base font-bold text-forest">{money(total)}</td><td className="quote-controls" /></tr></tfoot></table></div>

        <div className="quote-controls mt-5 grid gap-4 sm:grid-cols-3"><label className="text-xs font-medium text-forest/70">Quote valid until<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1 block w-full border border-forest/15 px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-forest/70 sm:col-span-2">Terms<textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} className="mt-1 block w-full border border-forest/15 px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-forest/70 sm:col-span-3">Warranty<textarea rows={2} value={warranty} onChange={(e) => setWarranty(e.target.value)} className="mt-1 block w-full border border-forest/15 px-3 py-2 text-sm" /></label></div>
        <div className="quote-controls mt-5 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => void persistDraft()} disabled={saving || ["accepted", "declined"].includes(selected.status)} className="inline-flex items-center gap-2 border border-forest/20 px-4 py-2.5 text-sm text-forest disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button><button type="button" onClick={() => void sendQuote()} disabled={saving || ["accepted", "declined"].includes(selected.status)} className="inline-flex items-center gap-2 bg-forest px-4 py-2.5 text-sm font-medium text-cream hover:bg-leaf disabled:opacity-50"><Send className="h-4 w-4" /> {selected.status === "sent" ? "Save and resend" : "Save and send"}</button>{selected.status === "sent" && <><button type="button" onClick={() => void closeQuote("accepted")} disabled={saving} className="inline-flex items-center gap-1 border border-leaf/30 px-3 py-2 text-sm text-leaf"><Check className="h-4 w-4" /> Accepted</button><button type="button" onClick={() => void closeQuote("declined")} disabled={saving} className="border border-red-200 px-3 py-2 text-sm text-red-700">Declined</button></>}</div>
        {selected.status === "sent" && <p className="quote-controls mt-3 text-right text-xs text-forest/50">Last sent {selected.sentAt ? new Date(selected.sentAt).toLocaleString() : ""}</p>}
        <QuotePrintDocument quote={selected} lines={lines} total={total} validUntil={validUntil} terms={terms} warranty={warranty} />
      </section> : <div className="border border-dashed border-forest/15 bg-white p-10 text-center text-sm text-forest/55">Select a quote request to review and prepare a quotation.</div>}
    </div>
  </main></div></div>;
}

function QuotePrintDocument({ quote, lines, total, validUntil, terms, warranty }: { quote: QuoteRequest; lines: QuoteLine[]; total: number; validUntil: string; terms: string; warranty: string }) {
  return <article className="quote-print">
    <div className="quote-print-contact">CREATE &amp; CO. AWISSAVELLA ROAD, HANWELLA&nbsp; | &nbsp;WHATSAPP: 076-554 9116&nbsp; | &nbsp;PHONE: 077-931 7271&nbsp; | &nbsp;FAX: 011-2075189</div>
    <h1 className="quote-print-brand">SAMANTHA ENTERPRISES</h1>
    <p className="quote-print-subtitle">Government &amp; Private Civil Contractor, Gardening Works and Land Reclamation and Filling</p>
    <p className="quote-print-subtitle">Provincial Council Reg: W/15616&nbsp; | &nbsp;CIDA Reg: 17743&nbsp; | &nbsp;SLIER DC No: RR00094233</p>
    <hr />
    <h2 className="quote-print-company">Nilla Garden Service and Landscaping Company</h2>
    <div className="quote-print-meta"><span>Date: {new Date().toLocaleDateString("en-GB")}</span><strong>Quotation No: {quote.quoteNumber}</strong></div>
    <div className="quote-print-customer"><strong>Customer:</strong> {quote.customerName}<br/><strong>Email:</strong> {quote.email}<br/><strong>Phone:</strong> {quote.phone}{quote.address ? <><br/><strong>Project location:</strong> {quote.address}</> : null}</div>
    <p className="quote-print-intro">Thank you for considering Nilla Garden Service and Landscaping Company for your gardening needs. Below is the detailed quotation for the requested services:</p>
    <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{lines.map((line, index) => <tr key={index}><td>{line.description}</td><td>{line.quantity.toLocaleString()} {line.unit}</td><td>{money(line.rate)}</td><td>{money(line.quantity * line.rate)}</td></tr>)}</tbody></table>
    <p className="quote-print-total">Total Amount Payable <strong>{money(total)}</strong></p>
    <h3 className="quote-print-terms-title">Terms and Conditions:</h3><ul className="quote-print-terms"><li>{terms}</li>{warranty && <li>Warranty: {warranty}</li>}{validUntil && <li>Valid until: {dateLabel(validUntil)}</li>}</ul>
  </article>;
}

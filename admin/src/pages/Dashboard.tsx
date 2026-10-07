import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Mail, Phone, Trash2, Check, Menu, X, Search, Inbox, MailOpen, Clock } from "lucide-react";
import { getInquiries, markAsRead, deleteInquiry, logout, type Inquiry } from "@/lib/api";

type StatusFilter = "all" | "unread" | "read";

export default function Dashboard() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const data = await getInquiries();
      setInquiries(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleMarkRead(id: number) {
    await markAsRead(id);
    setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, isRead: true } : i)));
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this inquiry?")) return;
    await deleteInquiry(id);
    setInquiries((prev) => prev.filter((i) => i.id !== id));
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const services = useMemo(() => Array.from(new Set(
    inquiries.map((inquiry) => inquiry.service).filter((service): service is string => Boolean(service)),
  )), [inquiries]);

  const stats = useMemo(() => {
    const unread = inquiries.filter((inquiry) => !inquiry.isRead).length;
    const today = new Date().toDateString();
    const todayCount = inquiries.filter((inquiry) => new Date(inquiry.createdAt).toDateString() === today).length;
    return { total: inquiries.length, unread, today: todayCount };
  }, [inquiries]);

  const filteredInquiries = useMemo(() => inquiries.filter((inquiry) => {
    if (statusFilter === "unread" && inquiry.isRead) return false;
    if (statusFilter === "read" && !inquiry.isRead) return false;
    if (serviceFilter !== "all" && inquiry.service !== serviceFilter) return false;
    const query = search.trim().toLowerCase();
    if (query && !`${inquiry.name} ${inquiry.email} ${inquiry.phone ?? ""} ${inquiry.message}`.toLowerCase().includes(query)) return false;
    return true;
  }), [inquiries, search, serviceFilter, statusFilter]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-forest/10 bg-cream/90 backdrop-blur-md">
        <nav className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <a href="/" className="flex shrink-0 items-center gap-2.5 text-forest">
            <img src="/images/sprout-logo.svg" alt="Nilla Garden" className="h-9 w-9" />
            <span className="leading-none">
              <span className="block text-xl font-semibold tracking-tight">Nilla</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-forest/60">Landscaping &amp; Garden</span>
            </span>
          </a>

          {/* <div className="hidden items-center gap-7 text-sm font-medium text-forest/80 md:flex">
            <a href="#" className="transition hover:text-leaf">Users</a>
     
          </div> */}

          <div className="hidden items-center gap-4 md:flex">
            <span className="text-xs text-forest/60">{stats.unread} unread</span>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-forest px-5 py-2 text-sm font-medium text-cream transition hover:bg-leaf">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>

          <button onClick={() => setMenuOpen((open) => !open)} className="text-forest md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </nav>
        {menuOpen && (
          <div className="space-y-4 border-t border-forest/10 bg-cream px-5 py-4 md:hidden">
            <a href="#services" onClick={() => setMenuOpen(false)} className="block font-medium text-forest">Services</a>
            <a href="#why-us" onClick={() => setMenuOpen(false)} className="block font-medium text-forest">Why Us</a>
            <a href="#process" onClick={() => setMenuOpen(false)} className="block font-medium text-forest">Process</a>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="block font-medium text-forest">Contact</a>
            <p className="text-xs text-forest/60">{stats.unread} unread inquiries</p>
            <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 bg-forest px-5 py-2.5 font-medium text-cream">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <section aria-label="Inquiry summary" className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border border-forest/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 text-forest/60"><Inbox className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Total inquiries</span></div>
            <p className="mt-2 text-2xl font-semibold text-forest">{stats.total}</p>
          </div>
          <div className="border border-forest/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 text-forest/60"><MailOpen className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Unread</span></div>
            <p className="mt-2 text-2xl font-semibold text-leaf">{stats.unread}</p>
          </div>
          <div className="border border-forest/10 bg-white/60 p-5">
            <div className="flex items-center gap-2 text-forest/60"><Clock className="h-4 w-4" /><span className="text-xs font-medium uppercase tracking-wide">Today</span></div>
            <p className="mt-2 text-2xl font-semibold text-forest">{stats.today}</p>
          </div>
        </section>

        <section aria-label="Filter inquiries" className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
            <input type="search" placeholder="Search name, email, phone, message..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20" />
          </div>
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20">
            <option value="all">All statuses</option><option value="unread">Unread only</option><option value="read">Read only</option>
          </select>
          <select aria-label="Filter by service" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)} className="border border-forest/15 bg-white px-4 py-2.5 text-sm text-forest outline-none focus:border-leaf focus:ring-2 focus:ring-leaf/20">
            <option value="all">All services</option>{services.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
        </section>

        {loading ? (
          <p className="text-forest/60">Loading...</p>
        ) : inquiries.length === 0 ? (
          <p className="text-forest/60">No inquiries yet.</p>
        ) : filteredInquiries.length === 0 ? (
          <p className="text-forest/60">No inquiries match your filters.</p>
        ) : (
          <div className="space-y-4">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className={` border p-5 ${
                  inq.isRead
                    ? "border-forest/10 bg-white/50"
                    : "border-leaf/40 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-forest">{inq.name}</h3>
                      {!inq.isRead && (
                        <span className="rounded-full bg-leaf px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cream">
                          New
                        </span>
                      )}
                      {inq.service && (
                        <span className="rounded-full bg-sage/40 px-2.5 py-0.5 text-xs text-forest">
                          {inq.service}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-forest/60">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {inq.email}
                      </span>
                      {inq.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {inq.phone}
                        </span>
                      )}
                      <span>{new Date(inq.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!inq.isRead && (
                      <button
                        onClick={() => handleMarkRead(inq.id)}
                        className="flex items-center gap-1.5  bg-forest px-3.5 py-1.5 text-xs font-medium text-cream transition hover:bg-leaf"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(inq.id)}
                      className="flex items-center gap-1.5  border border-red-200 px-3.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm text-forest/80">{inq.message}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

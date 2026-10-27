import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogOut, Mail, Menu, X } from "lucide-react";
import { getCurrentAdmin, getInquiries, logoutWithLog, type Inquiry } from "@/lib/api";

export default function AdminHeader({ unreadCount }: { unreadCount?: number }) {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Inquiry[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [displayUnreadCount, setDisplayUnreadCount] = useState(unreadCount ?? 0);
  const [canViewNotifications, setCanViewNotifications] = useState(unreadCount !== undefined);

  useEffect(() => { setDisplayUnreadCount(unreadCount ?? 0); }, [unreadCount]);
  useEffect(() => {
    if (unreadCount !== undefined) { setCanViewNotifications(true); return; }
    let active = true;
    getCurrentAdmin().then((admin) => {
      const allowed = admin.permissions.includes("*") || admin.permissions.includes("inquiries.read");
      if (!active) return;
      setCanViewNotifications(allowed);
      if (allowed) return getInquiries().then((items) => {
        if (active) setDisplayUnreadCount(items.filter((item) => !item.isRead).length);
      });
    }).catch(() => { if (active) setCanViewNotifications(false); });
    return () => { active = false; };
  }, [unreadCount]);

  function handleLogout() {
    void logoutWithLog();
    navigate("/login");
  }

  async function toggleNotifications() {
    if (notificationsOpen) {
      setNotificationsOpen(false);
      return;
    }
    setNotificationsOpen(true);
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const unread = (await getInquiries()).filter((inquiry) => !inquiry.isRead);
      setNotifications(unread.slice(0, 8));
      setDisplayUnreadCount(unread.length);
    } catch {
      setNotificationError("Could not load unread inquiries. Check your inbox access.");
    } finally {
      setNotificationLoading(false);
    }
  }

  return (
    <header className="admin-header sticky top-0 z-10 border-b border-forest/10 bg-cream/90 backdrop-blur-md">
      <nav className="flex h-16 w-full flex-nowrap items-center justify-between gap-2 px-3 sm:px-7">
        <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => window.dispatchEvent(new Event("admin-sidebar-toggle"))}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-forest transition hover:bg-sage/20"
        ><Menu className="h-5 w-5" /></button>
        <Link to="/" className="flex shrink-0 items-center gap-2.5 text-forest">
          <img src="/images/sprout-logo.svg" alt="Nilla Garden" className="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="leading-none">
            <span className="block text-xl font-semibold tracking-tight">Nilla</span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[0.14em] text-forest/60 sm:block">Landscaping &amp; Garden</span>
          </span>
        </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {canViewNotifications && (
            <div className="relative">
              <button type="button" onClick={() => void toggleNotifications()} aria-expanded={notificationsOpen} aria-haspopup="dialog" className="flex items-center gap-1.5 bg-sage/20 px-2 py-2 text-xs font-medium text-forest/75 transition hover:bg-sage/35 sm:gap-2 sm:px-3"><Mail className="h-4 w-4" /><span className="sm:hidden">{displayUnreadCount}</span><span className="hidden sm:inline">{displayUnreadCount} unread</span></button>
              {notificationsOpen && <section role="dialog" aria-label="Unread inquiries" className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-80 max-w-[calc(100vw-1.5rem)] border border-forest/10 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-forest/10 px-4 py-3"><div><h2 className="text-sm font-semibold text-forest">Unread inquiries</h2><p className="mt-0.5 text-xs text-forest/55">{displayUnreadCount} waiting for review</p></div><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications" className="p-1 text-forest/50 hover:text-forest"><X className="h-4 w-4" /></button></div>
                {notificationLoading ? <p className="px-4 py-5 text-sm text-forest/55">Loading notifications…</p> : notificationError ? <p role="alert" className="px-4 py-5 text-sm text-red-700">{notificationError}</p> : notifications.length === 0 ? <p className="px-4 py-5 text-sm text-forest/55">You’re all caught up.</p> : <ul className="max-h-[65vh] divide-y divide-forest/5 overflow-y-auto">{notifications.map((inquiry) => <li key={inquiry.id}><button type="button" onClick={() => { setNotificationsOpen(false); navigate(`/inquiries?inquiry=${inquiry.id}`); }} className="block w-full px-4 py-3 text-left transition hover:bg-sage/10"><span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-forest">{inquiry.name}</span><time className="shrink-0 text-[10px] text-forest/45">{new Date(inquiry.createdAt).toLocaleDateString()}</time></span><span className="mt-0.5 block truncate text-xs text-forest/55">{inquiry.email}{inquiry.service ? ` · ${inquiry.service}` : ""}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-forest/70">{inquiry.message}</span></button></li>)}</ul>}
                <button type="button" onClick={() => { setNotificationsOpen(false); navigate("/inquiries"); }} className="w-full border-t border-forest/10 px-4 py-2.5 text-left text-xs font-semibold text-leaf hover:bg-sage/10">Open all inquiries</button>
              </section>}
            </div>
          )}
          <button onClick={handleLogout} aria-label="Logout" className="flex items-center gap-2 bg-forest px-2.5 py-2.5 text-sm font-medium text-cream shadow-sm transition hover:bg-leaf sm:px-4">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

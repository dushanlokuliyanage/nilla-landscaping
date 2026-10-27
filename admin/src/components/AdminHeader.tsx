import { useNavigate } from "react-router-dom";
import { LogOut, Mail } from "lucide-react";
import { logoutWithLog } from "@/lib/api";

export default function AdminHeader({ unreadCount }: { unreadCount?: number }) {
  const navigate = useNavigate();

  function handleLogout() {
    void logoutWithLog();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-forest/10 bg-cream/90 backdrop-blur-md">
      <nav className="flex h-16 w-full flex-nowrap items-center justify-between gap-2 px-3 sm:px-7">
        <a href="/" className="flex shrink-0 items-center gap-2.5 text-forest">
          <img src="/images/sprout-logo.svg" alt="Nilla Garden" className="h-9 w-9 sm:h-10 sm:w-10" />
          <span className="leading-none">
            <span className="block text-xl font-semibold tracking-tight">Nilla</span>
            <span className="mt-1 hidden text-[9px] uppercase tracking-[0.14em] text-forest/60 sm:block">Landscaping &amp; Garden</span>
          </span>
        </a>

        <div className="flex items-center gap-2 sm:gap-4">
          {unreadCount !== undefined && (
            <span className="flex items-center gap-1.5 bg-sage/20 px-2 py-2 text-xs font-medium text-forest/75 sm:gap-2 sm:px-3"><Mail className="h-4 w-4" /><span className="sm:hidden">{unreadCount}</span><span className="hidden sm:inline">{unreadCount} unread</span></span>
          )}
          <button onClick={handleLogout} aria-label="Logout" className="flex items-center gap-2 bg-forest px-2.5 py-2.5 text-sm font-medium text-cream shadow-sm transition hover:bg-leaf sm:px-4">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>
    </header>
  );
}

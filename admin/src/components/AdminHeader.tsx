import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/api";

export default function AdminHeader({ unreadCount }: { unreadCount?: number }) {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-10 border-b border-forest/10 bg-cream/90 backdrop-blur-md">
      <nav className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <a href="/" className="flex shrink-0 items-center gap-2.5 text-forest">
          <img src="/images/sprout-logo.svg" alt="Nilla Garden" className="h-9 w-9" />
          <span className="leading-none">
            <span className="block text-xl font-semibold tracking-tight">Nilla</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-forest/60">Landscaping &amp; Garden</span>
          </span>
        </a>

        <div className="flex items-center gap-4">
          {unreadCount !== undefined && (
            <span className="text-xs text-forest/60">{unreadCount} unread</span>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 bg-forest px-5 py-2 text-sm font-medium text-cream transition hover:bg-leaf">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </nav>
    </header>
  );
}

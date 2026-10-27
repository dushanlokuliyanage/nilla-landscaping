import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Activity,
  Clapperboard,
  Images,
  LayoutDashboard,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  Users,
  LibraryBig,
  KeyRound,
  FileBarChart,
  ClipboardList,
  DatabaseBackup,
  X,
} from "lucide-react";
import { getCurrentAdmin } from "@/lib/api";

const tabs = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/inquiries", label: "Inquiries", icon: Mail, permission: "inquiries.read" },
  { to: "/quotes", label: "Generate Quote", icon: ClipboardList, permission: "inquiries.read" },
  { to: "/products", label: "Products", icon: Package, permission: "products.manage" },
  { to: "/gallery", label: "Gallery", icon: Images, permission: "products.manage" },
  { to: "/videos", label: "Videos", icon: Clapperboard, permission: "products.manage" },
  { to: "/media", label: "Media library", icon: LibraryBig, permission: "products.manage" },
  { to: "/orders", label: "Orders", icon: ShoppingBag, permission: "orders.read" },
  { to: "/reports", label: "Reports", icon: FileBarChart, permission: "orders.read" },
  { to: "/activity", label: "Activity log", icon: Activity, permission: "logs.read" },
  { to: "/access", label: "Access log", icon: ShieldCheck, permission: "logs.read" },
  { to: "/team", label: "Team", icon: Users, permission: "team.manage" },
  { to: "/roles", label: "Roles", icon: KeyRound, permission: "roles.manage" },
  { to: "/backup", label: "Backup & restore", icon: DatabaseBackup, permission: "backup.manage" },
];

export default function NavTabs() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("admin-sidebar-collapsed") === "true");
    const toggle = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setCollapsed((current) => {
          const next = !current;
          localStorage.setItem("admin-sidebar-collapsed", String(next));
          return next;
        });
      } else {
        setMobileOpen((current) => !current);
      }
    };
    window.addEventListener("admin-sidebar-toggle", toggle);
    return () => window.removeEventListener("admin-sidebar-toggle", toggle);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--admin-sidebar-width", collapsed ? "4rem" : "14rem");
  }, [collapsed]);

  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => setPermissions(admin.permissions))
      .catch(() => setPermissions([]));
  }, []);

  const visibleTabs = tabs.filter(
    (tab) => !tab.permission || permissions.includes("*") || permissions.includes(tab.permission)
  );

  return (
    <>
      {mobileOpen && <button aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-20 bg-black/30 md:hidden" />}
      <aside
        aria-label="Admin navigation"
        className={`admin-sidebar fixed bottom-0 left-0 top-16 z-30 border-r border-forest/10 bg-white transition-all duration-200 md:translate-x-0 ${mobileOpen ? "w-64 translate-x-0 shadow-xl" : "w-64 -translate-x-full"} ${collapsed ? "md:w-16" : "md:w-56"}`}
      >
      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2 md:gap-1.5 md:p-3">
        <div className="flex items-center justify-between px-3 pb-2 pt-1">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] text-forest/40 ${collapsed ? "md:hidden" : ""}`}>
          Workspace
        </p>
        <button type="button" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} className="text-forest/60 hover:text-forest md:hidden"><X className="h-5 w-5" /></button>
        </div>
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            title={tab.label}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex w-full flex-row items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-medium leading-tight transition ${collapsed ? "md:justify-center md:px-1" : "md:px-3"} ${
                isActive
                  ? "border-l-leaf bg-sage/20 text-forest"
                  : "border-l-transparent text-forest/65 hover:bg-sage/10 hover:text-forest"
              }`
            }
          >
            <tab.icon className="h-4 w-4 shrink-0 opacity-75 group-hover:opacity-100" strokeWidth={1.8} />
            <span className={`max-w-full text-left ${collapsed ? "md:hidden" : ""}`}>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
    </>
  );
}

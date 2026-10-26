import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Activity, Clapperboard, Images, LayoutDashboard, Mail, Package, ShieldCheck, ShoppingBag, Users, LibraryBig, KeyRound } from "lucide-react";
import { getCurrentAdmin } from "@/lib/api";

const tabs = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/inquiries", label: "Inquiries", icon: Mail, permission: "inquiries.read" },
  { to: "/products", label: "Products", icon: Package, permission: "products.manage" },
  { to: "/gallery", label: "Gallery", icon: Images, permission: "products.manage" },
  { to: "/videos", label: "Videos", icon: Clapperboard, permission: "products.manage" },
  { to: "/media", label: "Media library", icon: LibraryBig, permission: "products.manage" },
  { to: "/orders", label: "Orders", icon: ShoppingBag, permission: "orders.read" },
  { to: "/activity", label: "Activity log", icon: Activity, permission: "logs.read" },
  { to: "/access", label: "Access log", icon: ShieldCheck, permission: "logs.read" },
  { to: "/team", label: "Team", icon: Users, permission: "team.manage" },
  { to: "/roles", label: "Roles", icon: KeyRound, permission: "roles.manage" },
];

export default function NavTabs() {
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => { getCurrentAdmin().then((admin) => setPermissions(admin.permissions)).catch(() => setPermissions([])); }, []);
  const visibleTabs = tabs.filter((tab) => !tab.permission || permissions.includes("*") || permissions.includes(tab.permission));

  return (
    <aside aria-label="Admin navigation" className="border-b border-forest/10 bg-white md:fixed md:top-16 md:bottom-0 md:left-0 md:z-20 md:w-56 md:border-r md:border-b-0">
      <nav className="flex gap-1 overflow-x-auto p-3 md:h-full md:flex-col md:gap-1.5 md:overflow-y-auto md:p-4">
        <p className="hidden px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-forest/40 md:block">Workspace</p>
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) => `group flex shrink-0 items-center gap-3  border-b-2 px-4 py-2.5 text-sm font-medium transition md:w-full md:border-b-0 md:border-l-2 md:px-3 ${
              isActive
                ? "border-leaf bg-sage/20 text-forest md:border-l-leaf"
                : "border-transparent text-forest/65 hover:bg-sage/10 hover:text-forest"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0 opacity-75 group-hover:opacity-100" strokeWidth={1.8} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

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
];

export default function NavTabs() {
  const [permissions, setPermissions] = useState<string[]>([]);
  useEffect(() => {
    getCurrentAdmin()
      .then((admin) => setPermissions(admin.permissions))
      .catch(() => setPermissions([]));
  }, []);

  const visibleTabs = tabs.filter(
    (tab) => !tab.permission || permissions.includes("*") || permissions.includes(tab.permission)
  );

  return (
    <aside
      aria-label="Admin navigation"
      className="fixed bottom-0 left-0 top-16 z-20 w-16 border-r border-forest/10 bg-white md:w-56"
    >
      <nav className="flex h-full flex-col gap-1 overflow-y-auto p-1.5 md:gap-1.5 md:p-4">
        <p className="hidden px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-forest/40 md:block">
          Workspace
        </p>
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            title={tab.label}
            className={({ isActive }) =>
              `group flex w-full flex-col items-center gap-1 border-l-2 px-0.5 py-2 text-[9px] font-medium leading-tight transition md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                isActive
                  ? "border-l-leaf bg-sage/20 text-forest"
                  : "border-l-transparent text-forest/65 hover:bg-sage/10 hover:text-forest"
              }`
            }
          >
            <tab.icon className="h-4 w-4 shrink-0 opacity-75 group-hover:opacity-100" strokeWidth={1.8} />
            <span className="max-w-full text-center md:text-left">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

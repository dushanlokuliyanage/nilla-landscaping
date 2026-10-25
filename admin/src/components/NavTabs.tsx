import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentAdmin } from "@/lib/api";

const tabs = [
  { to: "/", label: "Inquiries" },
  { to: "/products", label: "Products", permission: "products" },
    { to: "/gallery", label: "Gallery", permission: "products" },
      { to: "/videos", label: "Videos", permission: "products" },
  { to: "/orders", label: "Orders" },
  { to: "/activity", label: "Activity log", permission: "logs" },
  { to: "/access", label: "Access log", permission: "logs" },
  { to: "/team", label: "Team", permission: "owner" },
];

export default function NavTabs() {
  const [role, setRole] = useState<string>("");
  useEffect(() => { getCurrentAdmin().then((admin) => setRole(admin.role)).catch(() => setRole("")); }, []);
  return (
    <nav className="border-b border-forest/10 bg-cream">
      <div className="mx-auto flex max-w-5xl gap-2 px-5">
        {tabs.filter((t) => !t.permission || (t.permission === "logs" && (role === "owner" || role === "manager")) || (t.permission === "owner" && role === "owner") || (t.permission === "products" && (role === "owner" || role === "manager"))).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              `border-b-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-leaf text-forest"
                  : "border-transparent text-forest/60 hover:text-forest"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

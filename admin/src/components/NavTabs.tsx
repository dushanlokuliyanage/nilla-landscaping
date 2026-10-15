import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Inquiries" },
  { to: "/products", label: "Products" },
  { to: "/orders", label: "Orders" },
];

export default function NavTabs() {
  return (
    <nav className="border-b border-forest/10 bg-cream">
      <div className="mx-auto flex max-w-5xl gap-2 px-5">
        {tabs.map((t) => (
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
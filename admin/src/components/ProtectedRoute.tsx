import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentAdmin, isAuthenticated } from "@/lib/api";

function firstAllowedPath(permissions: string[]) {
  if (permissions.includes("*")) return "/";
  if (permissions.includes("inquiries.read")) return "/inquiries";
  if (permissions.includes("orders.read")) return "/orders";
  if (permissions.includes("products.manage")) return "/products";
  if (permissions.includes("team.manage")) return "/team";
  if (permissions.includes("roles.manage")) return "/roles";
  if (permissions.includes("logs.read")) return "/activity";
  return "/";
}

export default function ProtectedRoute({ children, permission }: { children: React.ReactNode; permission?: string }) {
  const [checking, setChecking] = useState(Boolean(permission));
  const [allowed, setAllowed] = useState(!permission);
  const [fallback, setFallback] = useState("/");

  useEffect(() => {
    if (!permission || !isAuthenticated()) {
      setChecking(false);
      return;
    }
    let active = true;
    getCurrentAdmin()
      .then((admin) => {
        if (active) {
          setAllowed(admin.permissions.includes("*") || admin.permissions.includes(permission));
          setFallback(firstAllowedPath(admin.permissions));
        }
      })
      .catch(() => { if (active) setAllowed(false); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [permission]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (checking) return <main className="min-h-screen p-8 text-sm text-forest/60">Checking your access…</main>;
  if (!allowed) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}

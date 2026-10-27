import { Outlet } from "react-router-dom";
import AdminHeader from "@/components/AdminHeader";
import NavTabs from "@/components/NavTabs";

export default function AdminLayout() {
  return (
    <div className="min-h-screen">
      <AdminHeader />
      <NavTabs />
      <Outlet />
    </div>
  );
}

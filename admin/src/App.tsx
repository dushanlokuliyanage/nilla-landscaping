import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/AdminLayout";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Inquiries = lazy(() => import("@/pages/Inquiries"));
const Products = lazy(() => import("@/pages/Products"));
const Orders = lazy(() => import("@/pages/Orders"));
const Team = lazy(() => import("@/pages/Team"));
const Logs = lazy(() => import("@/pages/Logs"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Videos = lazy(() => import("@/pages/Videos"));
const MediaLibrary = lazy(() => import("@/pages/MediaLibrary"));
const Roles = lazy(() => import("@/pages/Roles"));
const Reports = lazy(() => import("@/pages/Reports"));
const Quotes = lazy(() => import("@/pages/Quotes"));
const Backup = lazy(() => import("@/pages/Backup"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status" className="p-6 text-sm text-stone-600">Loading page…</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inquiries" element={<ProtectedRoute permission="inquiries.read"><Inquiries /></ProtectedRoute>} />
          <Route path="/quotes" element={<ProtectedRoute permission="inquiries.read"><Quotes /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute permission="team.manage"><Team /></ProtectedRoute>} />
          <Route path="/roles" element={<ProtectedRoute permission="roles.manage"><Roles /></ProtectedRoute>} />
          <Route path="/backup" element={<ProtectedRoute permission="backup.manage"><Backup /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute permission="logs.read"><Logs kind="activity" /></ProtectedRoute>} />
          <Route path="/access" element={<ProtectedRoute permission="logs.read"><Logs kind="access" /></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute permission="products.manage"><Gallery /></ProtectedRoute>} />
          <Route path="/videos" element={<ProtectedRoute permission="products.manage"><Videos /></ProtectedRoute>} />
          <Route path="/media" element={<ProtectedRoute permission="products.manage"><MediaLibrary /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute permission="products.manage"><Products /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute permission="orders.read"><Orders /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute permission="orders.read"><Reports /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

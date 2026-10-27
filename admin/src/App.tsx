import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Inquiries from "@/pages/Inquiries";
import Products from "@/pages/Products";
import Orders from "@/pages/Orders";
import ProtectedRoute from "@/components/ProtectedRoute";
import Team from "@/pages/Team";
import Logs from "@/pages/Logs";
import Gallery from "@/pages/Gallery";
import Videos from "@/pages/Videos";
import MediaLibrary from "@/pages/MediaLibrary";
import Roles from "@/pages/Roles";
import Reports from "@/pages/Reports";
import Quotes from "@/pages/Quotes";
import AdminLayout from "@/components/AdminLayout";
import Backup from "@/pages/Backup";

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

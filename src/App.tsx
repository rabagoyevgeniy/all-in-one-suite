import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminClients from "./pages/admin/AdminClients";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminEconomy from "./pages/admin/AdminEconomy";
import CoachDashboard from "./pages/coach/CoachDashboard";
import ParentDashboard from "./pages/parent/ParentDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import ProDashboard from "./pages/pro/ProDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<LoginPage />} />

            {/* Admin routes */}
            <Route element={<RoleGuard allowedRoles={['admin', 'head_manager']}><AppLayout /></RoleGuard>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/coaches" element={<AdminCoaches />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/financial" element={<AdminFinance />} />
              <Route path="/admin/economy" element={<AdminEconomy />} />
            </Route>

            {/* Coach routes */}
            <Route element={<RoleGuard allowedRoles={['coach']}><AppLayout /></RoleGuard>}>
              <Route path="/coach" element={<CoachDashboard />} />
            </Route>

            {/* Parent routes */}
            <Route element={<RoleGuard allowedRoles={['parent']}><AppLayout /></RoleGuard>}>
              <Route path="/parent" element={<ParentDashboard />} />
            </Route>

            {/* Student routes (Arena theme) */}
            <Route element={<RoleGuard allowedRoles={['student']}><AppLayout theme="arena" /></RoleGuard>}>
              <Route path="/student" element={<StudentDashboard />} />
            </Route>

            {/* Pro Athlete routes (Arena theme) */}
            <Route element={<RoleGuard allowedRoles={['pro_athlete']}><AppLayout theme="arena" /></RoleGuard>}>
              <Route path="/pro" element={<ProDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

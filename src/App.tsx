import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { DevAccountSwitcher } from "@/components/DevAccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import ComingSoon from "./pages/ComingSoon";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminClients from "./pages/admin/AdminClients";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminEconomy from "./pages/admin/AdminEconomy";
import AdminTasks from "./pages/admin/AdminTasks";

// Coach
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachSchedule from "./pages/coach/CoachSchedule";
import CoachStudents from "./pages/coach/CoachStudents";
import CoachEarnings from "./pages/coach/CoachEarnings";
import CoachProfile from "./pages/coach/CoachProfile";
import LessonReport from "./pages/coach/LessonReport";

// Parent
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentBooking from "./pages/parent/ParentBooking";
import ParentCoins from "./pages/parent/ParentCoins";
import ParentChat from "./pages/parent/ParentChat";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import TaskBoard from "./pages/student/TaskBoard";
import StudentStore from "./pages/student/StudentStore";
import DuelArena from "./pages/student/DuelArena";
import StudentProfile from "./pages/student/StudentProfile";

// Pro
import ProDashboard from "./pages/pro/ProDashboard";
import ProArena from "./pages/pro/ProArena";
import ProRecords from "./pages/pro/ProRecords";
import ProProfile from "./pages/pro/ProProfile";

// PM
import PMDashboard from "./pages/pm/PMDashboard";
import PMReports from "./pages/pm/PMReports";
import PMEarnings from "./pages/pm/PMEarnings";

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
              <Route path="/admin/tasks" element={<AdminTasks />} />
            </Route>

            {/* Coach routes */}
            <Route element={<RoleGuard allowedRoles={['coach']}><AppLayout /></RoleGuard>}>
              <Route path="/coach" element={<CoachDashboard />} />
              <Route path="/coach/schedule" element={<CoachSchedule />} />
              <Route path="/coach/students" element={<CoachStudents />} />
              <Route path="/coach/earnings" element={<CoachEarnings />} />
              <Route path="/coach/profile" element={<CoachProfile />} />
              <Route path="/coach/lesson/:id" element={<LessonReport />} />
            </Route>

            {/* PM routes */}
            <Route element={<RoleGuard allowedRoles={['personal_manager']}><AppLayout /></RoleGuard>}>
              <Route path="/pm" element={<PMDashboard />} />
              <Route path="/pm/clients" element={<ComingSoon />} />
              <Route path="/pm/reports" element={<PMReports />} />
              <Route path="/pm/earnings" element={<PMEarnings />} />
              <Route path="/pm/profile" element={<ComingSoon />} />
            </Route>

            {/* Parent routes */}
            <Route element={<RoleGuard allowedRoles={['parent']}><AppLayout /></RoleGuard>}>
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/children/:id" element={<ComingSoon />} />
              <Route path="/parent/booking" element={<ParentBooking />} />
              <Route path="/parent/financial" element={<ComingSoon />} />
              <Route path="/parent/coins" element={<ParentCoins />} />
              <Route path="/parent/referrals" element={<ComingSoon />} />
              <Route path="/parent/chat" element={<ParentChat />} />
            </Route>

            {/* Student routes (Arena theme) */}
            <Route element={<RoleGuard allowedRoles={['student']}><AppLayout theme="arena" /></RoleGuard>}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/tasks" element={<TaskBoard />} />
              <Route path="/student/store" element={<StudentStore />} />
              <Route path="/student/duels" element={<DuelArena />} />
              <Route path="/student/leaderboard" element={<ComingSoon />} />
              <Route path="/student/skills" element={<ComingSoon />} />
              <Route path="/student/profile" element={<StudentProfile />} />
            </Route>

            {/* Pro Athlete routes (Arena theme) */}
            <Route element={<RoleGuard allowedRoles={['pro_athlete']}><AppLayout theme="arena" /></RoleGuard>}>
              <Route path="/pro" element={<ProDashboard />} />
              <Route path="/pro/arena" element={<ProArena />} />
              <Route path="/pro/records" element={<ProRecords />} />
              <Route path="/pro/profile" element={<ProProfile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <DevAccountSwitcher />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

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
import AdminPricing from "./pages/admin/AdminPricing";

// Coach
import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachSchedule from "./pages/coach/CoachSchedule";
import CoachStudents from "./pages/coach/CoachStudents";
import CoachEarnings from "./pages/coach/CoachEarnings";
import CoachProfile from "./pages/coach/CoachProfile";
import LessonReport from "./pages/coach/LessonReport";
import CoachShop from "./pages/coach/CoachShop";
import CoachActiveLesson from "./pages/coach/CoachActiveLesson";
import CoachLiveTracking from "./pages/coach/CoachLiveTracking";
import CoachLessonsHistory from "./pages/coach/CoachLessonsHistory";
import CoachRatings from "./pages/coach/CoachRatings";
import CoachCoins from "./pages/coach/CoachCoins";
import CoachRankHistory from "./pages/coach/CoachRankHistory";

// Parent
import ParentDashboard from "./pages/parent/ParentDashboard";
import ParentBooking from "./pages/parent/ParentBooking";
import ParentCoins from "./pages/parent/ParentCoins";
import ChatList from "./pages/chat/ChatList";
import ChatRoom from "./pages/chat/ChatRoom";
import ParentShop from "./pages/parent/ParentShop";
import ParentPayments from "./pages/parent/ParentPayments";

// Payment
import PaymentScreen from "./pages/payment/PaymentScreen";
import PaymentSuccess from "./pages/payment/PaymentSuccess";

// Student
import StudentDashboard from "./pages/student/StudentDashboard";
import TaskBoard from "./pages/student/TaskBoard";
import StudentStore from "./pages/student/StudentStore";
import DuelArena from "./pages/student/DuelArena";
import StudentProfile from "./pages/student/StudentProfile";
import Education from "./pages/student/Education";
import LiveDuels from "./pages/student/LiveDuels";

// Pro
import ProDashboard from "./pages/pro/ProDashboard";
import ProArena from "./pages/pro/ProArena";
import ProRecords from "./pages/pro/ProRecords";
import ProProfile from "./pages/pro/ProProfile";
import ProShop from "./pages/pro/ProShop";

// PM
import PMDashboard from "./pages/pm/PMDashboard";
import PMReports from "./pages/pm/PMReports";
import PMEarnings from "./pages/pm/PMEarnings";
import OnboardingPage from "./pages/OnboardingPage";
import SettingsPage from "./pages/Settings";

// AI & Notifications
import AIAssistant from "./pages/AIAssistant";
import NotificationsPage from "./pages/NotificationsPage";
import { AIAssistantFAB } from "./components/AIAssistantFAB";
import { OnboardingGuard } from "./components/OnboardingGuard";

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
            <Route path="/onboarding" element={<OnboardingPage />} />

            {/* Admin routes */}
            <Route element={<RoleGuard allowedRoles={['admin', 'head_manager']}><AppLayout /></RoleGuard>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/coaches" element={<AdminCoaches />} />
              <Route path="/admin/clients" element={<AdminClients />} />
              <Route path="/admin/bookings" element={<AdminBookings />} />
              <Route path="/admin/financial" element={<AdminFinance />} />
              <Route path="/admin/economy" element={<AdminEconomy />} />
              <Route path="/admin/tasks" element={<AdminTasks />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />
            </Route>

            {/* Coach routes */}
            <Route element={<RoleGuard allowedRoles={['coach']}><AppLayout /></RoleGuard>}>
              <Route path="/coach" element={<CoachDashboard />} />
              <Route path="/coach/schedule" element={<CoachSchedule />} />
              <Route path="/coach/students" element={<CoachStudents />} />
              <Route path="/coach/earnings" element={<CoachEarnings />} />
              <Route path="/coach/profile" element={<CoachProfile />} />
              <Route path="/coach/lesson/:id" element={<LessonReport />} />
              <Route path="/coach/lesson/:bookingId/active" element={<CoachActiveLesson />} />
              <Route path="/coach/shop" element={<CoachShop />} />
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
              <Route path="/parent/payments" element={<ParentPayments />} />
              <Route path="/parent/coins" element={<ParentCoins />} />
              <Route path="/parent/referrals" element={<ComingSoon />} />
              <Route path="/parent/shop" element={<ParentShop />} />
            </Route>

            {/* Payment routes (parent accessible) */}
            <Route element={<RoleGuard allowedRoles={['parent']}><AppLayout /></RoleGuard>}>
              <Route path="/payment" element={<PaymentScreen />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
            </Route>

            {/* Chat routes (all authenticated roles) */}
            <Route element={<RoleGuard allowedRoles={['parent', 'coach', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AppLayout /></RoleGuard>}>
              <Route path="/chat" element={<ChatList />} />
              <Route path="/chat/:roomId" element={<ChatRoom />} />
            </Route>

            {/* Student routes (Arena theme) */}
            <Route element={<RoleGuard allowedRoles={['student']}><AppLayout theme="arena" /></RoleGuard>}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/tasks" element={<TaskBoard />} />
              <Route path="/student/store" element={<StudentStore />} />
              <Route path="/student/duels" element={<DuelArena />} />
              <Route path="/student/education" element={<Education />} />
              <Route path="/student/live-duels" element={<LiveDuels />} />
              <Route path="/student/leaderboard" element={<ComingSoon />} />
              <Route path="/student/skills" element={<ComingSoon />} />
              <Route path="/student/profile" element={<StudentProfile />} />
            </Route>

            {/* Pro Athlete routes (Arena theme) */}
            <Route element={<RoleGuard allowedRoles={['pro_athlete']}><AppLayout theme="arena" /></RoleGuard>}>
              <Route path="/pro" element={<ProDashboard />} />
              <Route path="/pro/arena" element={<ProArena />} />
              <Route path="/pro/records" element={<ProRecords />} />
              <Route path="/pro/shop" element={<ProShop />} />
              <Route path="/pro/profile" element={<ProProfile />} />
            </Route>

            {/* AI Assistant (all authenticated roles, no AppLayout wrapper) */}
            <Route path="/ai-assistant" element={<RoleGuard allowedRoles={['parent', 'coach', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AIAssistant /></RoleGuard>} />

            {/* Notifications (all roles, uses AppLayout) */}
            <Route element={<RoleGuard allowedRoles={['parent', 'coach', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AppLayout /></RoleGuard>}>
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <OnboardingGuard />
          <AIAssistantFAB />
          <DevAccountSwitcher />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

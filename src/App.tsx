import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { DevAccountSwitcher } from "@/components/DevAccountSwitcher";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
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
import PMClients from "./pages/pm/PMClients";
import PMReports from "./pages/pm/PMReports";
import PMEarnings from "./pages/pm/PMEarnings";
import PMProfile from "./pages/pm/PMProfile";
import CoachAchievements from "./pages/coach/CoachAchievements";
import ParentChildren from "./pages/parent/ParentChildren";
import StudentAchievements from "./pages/student/StudentAchievements";
import OnboardingPage from "./pages/OnboardingPage";
import SettingsPage from "./pages/Settings";

// AI & Notifications
import AIAssistant from "./pages/AIAssistant";
import NotificationsPage from "./pages/NotificationsPage";
import { AIAssistantFAB } from "./components/AIAssistantFAB";
import { OnboardingGuard } from "./components/OnboardingGuard";

// Helper to wrap page elements with PageErrorBoundary
const P = (name: string, element: React.ReactNode) => (
  <PageErrorBoundary pageName={name}>{element}</PageErrorBoundary>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <Routes>
              <Route path="/" element={P("Home", <Index />)} />
              <Route path="/auth/login" element={P("Login", <LoginPage />)} />
              <Route path="/onboarding" element={P("Onboarding", <OnboardingPage />)} />

              {/* Admin routes */}
              <Route element={<RoleGuard allowedRoles={['admin', 'head_manager']}><AppLayout /></RoleGuard>}>
                <Route path="/admin" element={P("Admin Dashboard", <AdminDashboard />)} />
                <Route path="/admin/coaches" element={P("Admin Coaches", <AdminCoaches />)} />
                <Route path="/admin/clients" element={P("Admin Clients", <AdminClients />)} />
                <Route path="/admin/bookings" element={P("Admin Bookings", <AdminBookings />)} />
                <Route path="/admin/financial" element={P("Admin Finance", <AdminFinance />)} />
                <Route path="/admin/economy" element={P("Admin Economy", <AdminEconomy />)} />
                <Route path="/admin/tasks" element={P("Admin Tasks", <AdminTasks />)} />
                <Route path="/admin/pricing" element={P("Admin Pricing", <AdminPricing />)} />
              </Route>

              {/* Coach routes */}
              <Route element={<RoleGuard allowedRoles={['coach']}><AppLayout /></RoleGuard>}>
                <Route path="/coach" element={P("Coach Dashboard", <CoachDashboard />)} />
                <Route path="/coach/schedule" element={P("Coach Schedule", <CoachSchedule />)} />
                <Route path="/coach/students" element={P("Coach Students", <CoachStudents />)} />
                <Route path="/coach/earnings" element={P("Coach Earnings", <CoachEarnings />)} />
                <Route path="/coach/profile" element={P("Coach Profile", <CoachProfile />)} />
                <Route path="/coach/lesson/:bookingId/active" element={P("Active Lesson", <CoachActiveLesson />)} />
                <Route path="/coach/lesson/:id/report" element={P("Lesson Report", <LessonReport />)} />
                <Route path="/coach/lesson/:id" element={P("Lesson Report", <LessonReport />)} />
                <Route path="/coach/live-tracking" element={P("Live Tracking", <CoachLiveTracking />)} />
                <Route path="/coach/lessons-history" element={P("Lessons History", <CoachLessonsHistory />)} />
                <Route path="/coach/ratings" element={P("Coach Ratings", <CoachRatings />)} />
                <Route path="/coach/coins" element={P("Coach Coins", <CoachCoins />)} />
                <Route path="/coach/rank" element={P("Coach Rank", <CoachRankHistory />)} />
                <Route path="/coach/shop" element={P("Coach Shop", <CoachShop />)} />
                <Route path="/coach/achievements" element={P("Coach Achievements", <CoachAchievements />)} />
              </Route>

              {/* PM routes */}
              <Route element={<RoleGuard allowedRoles={['personal_manager']}><AppLayout /></RoleGuard>}>
                <Route path="/pm" element={P("PM Dashboard", <PMDashboard />)} />
                <Route path="/pm/clients" element={P("PM Clients", <PMClients />)} />
                <Route path="/pm/reports" element={P("PM Reports", <PMReports />)} />
                <Route path="/pm/earnings" element={P("PM Earnings", <PMEarnings />)} />
                <Route path="/pm/profile" element={P("PM Profile", <PMProfile />)} />
              </Route>

              {/* Parent routes */}
              <Route element={<RoleGuard allowedRoles={['parent']}><AppLayout /></RoleGuard>}>
                <Route path="/parent" element={P("Parent Dashboard", <ParentDashboard />)} />
                <Route path="/parent/children" element={P("My Children", <ParentChildren />)} />
                <Route path="/parent/children/:id" element={P("My Children", <ParentChildren />)} />
                <Route path="/parent/booking" element={P("Booking", <ParentBooking />)} />
                <Route path="/parent/financial" element={P("Financial", <ComingSoon />)} />
                <Route path="/parent/payments" element={P("Payments", <ParentPayments />)} />
                <Route path="/parent/coins" element={P("Coins", <ParentCoins />)} />
                <Route path="/parent/referrals" element={P("Referrals", <ComingSoon />)} />
                <Route path="/parent/shop" element={P("Shop", <ParentShop />)} />
              </Route>

              {/* Payment routes */}
              <Route element={<RoleGuard allowedRoles={['parent']}><AppLayout /></RoleGuard>}>
                <Route path="/payment" element={P("Payment", <PaymentScreen />)} />
                <Route path="/payment/success" element={P("Payment Success", <PaymentSuccess />)} />
              </Route>

              {/* Chat routes */}
              <Route element={<RoleGuard allowedRoles={['parent', 'coach', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AppLayout /></RoleGuard>}>
                <Route path="/chat" element={P("Chat", <ChatList />)} />
                <Route path="/chat/:roomId" element={P("Chat Room", <ChatRoom />)} />
              </Route>

              {/* Student routes */}
              <Route element={<RoleGuard allowedRoles={['student']}><AppLayout theme="arena" /></RoleGuard>}>
                <Route path="/student" element={P("Student Dashboard", <StudentDashboard />)} />
                <Route path="/student/tasks" element={P("Tasks", <TaskBoard />)} />
                <Route path="/student/store" element={P("Store", <StudentStore />)} />
                <Route path="/student/duels" element={P("Duels", <DuelArena />)} />
                <Route path="/student/education" element={P("Education", <Education />)} />
                <Route path="/student/live-duels" element={P("Live Duels", <LiveDuels />)} />
                <Route path="/student/leaderboard" element={P("Leaderboard", <ComingSoon />)} />
                <Route path="/student/skills" element={P("Skills", <ComingSoon />)} />
                <Route path="/student/profile" element={P("Student Profile", <StudentProfile />)} />
                <Route path="/student/achievements" element={P("Achievements", <StudentAchievements />)} />
              </Route>

              {/* Pro Athlete routes */}
              <Route element={<RoleGuard allowedRoles={['pro_athlete']}><AppLayout theme="arena" /></RoleGuard>}>
                <Route path="/pro" element={P("Pro Dashboard", <ProDashboard />)} />
                <Route path="/pro/arena" element={P("Arena", <ProArena />)} />
                <Route path="/pro/records" element={P("Records", <ProRecords />)} />
                <Route path="/pro/shop" element={P("Shop", <ProShop />)} />
                <Route path="/pro/profile" element={P("Pro Profile", <ProProfile />)} />
              </Route>

              {/* AI Assistant */}
              <Route path="/ai-assistant" element={<RoleGuard allowedRoles={['parent', 'coach', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}>{P("AI Assistant", <AIAssistant />)}</RoleGuard>} />

              {/* Notifications & Settings */}
              <Route element={<RoleGuard allowedRoles={['parent', 'coach', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AppLayout /></RoleGuard>}>
                <Route path="/notifications" element={P("Notifications", <NotificationsPage />)} />
                <Route path="/settings" element={P("Settings", <SettingsPage />)} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            <OnboardingGuard />
            <AIAssistantFAB />
            <DevAccountSwitcher />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

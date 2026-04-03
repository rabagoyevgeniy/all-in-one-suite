import { Suspense, lazy } from "react";
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
import { Loader2 } from "lucide-react";

// Lazy-loaded pages — each becomes a separate chunk
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCoaches = lazy(() => import("./pages/admin/AdminCoaches"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminEconomy = lazy(() => import("./pages/admin/AdminEconomy"));
const AdminTasks = lazy(() => import("./pages/admin/AdminTasks"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const AdminShop = lazy(() => import("./pages/admin/AdminShop"));

// Coach
const CoachDashboard = lazy(() => import("./pages/coach/CoachDashboard"));
const CoachSchedule = lazy(() => import("./pages/coach/CoachSchedule"));
const CoachStudents = lazy(() => import("./pages/coach/CoachStudents"));
const CoachEarnings = lazy(() => import("./pages/coach/CoachEarnings"));
const CoachProfile = lazy(() => import("./pages/coach/CoachProfile"));
const LessonReport = lazy(() => import("./pages/coach/LessonReport"));
const CoachShop = lazy(() => import("./pages/coach/CoachShop"));
const CoachActiveLesson = lazy(() => import("./pages/coach/CoachActiveLesson"));
const CoachLiveTracking = lazy(() => import("./pages/coach/CoachLiveTracking"));
const CoachLessonsHistory = lazy(() => import("./pages/coach/CoachLessonsHistory"));
const CoachRatings = lazy(() => import("./pages/coach/CoachRatings"));
const CoachCoins = lazy(() => import("./pages/coach/CoachCoins"));
const CoachRankHistory = lazy(() => import("./pages/coach/CoachRankHistory"));
const CoachAchievements = lazy(() => import("./pages/coach/CoachAchievements"));

// Parent
const ParentDashboard = lazy(() => import("./pages/parent/ParentDashboard"));
const ParentBooking = lazy(() => import("./pages/parent/ParentBooking"));
const ParentCoins = lazy(() => import("./pages/parent/ParentCoins"));
const ParentShop = lazy(() => import("./pages/parent/ParentShop"));
const ParentPayments = lazy(() => import("./pages/parent/ParentPayments"));
const ParentReferrals = lazy(() => import("./pages/parent/ParentReferrals"));
const ParentChildren = lazy(() => import("./pages/parent/ParentChildren"));
const ParentChildDetail = lazy(() => import("./pages/parent/ParentChildDetail"));
const ParentFinancials = lazy(() => import("./pages/parent/ParentFinancials"));

// Chat
const ChatList = lazy(() => import("./pages/chat/ChatList"));
const ChatRoom = lazy(() => import("./pages/chat/ChatRoom"));

// Payment
const PaymentScreen = lazy(() => import("./pages/payment/PaymentScreen"));
const PaymentSuccess = lazy(() => import("./pages/payment/PaymentSuccess"));

// Student
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const TaskBoard = lazy(() => import("./pages/student/TaskBoard"));
const StudentStore = lazy(() => import("./pages/student/StudentStore"));
const DuelArena = lazy(() => import("./pages/student/DuelArena"));
const StudentProfile = lazy(() => import("./pages/student/StudentProfile"));
const Education = lazy(() => import("./pages/student/Education"));
const LiveDuels = lazy(() => import("./pages/student/LiveDuels"));
const StudentLeaderboard = lazy(() => import("./pages/student/StudentLeaderboard"));
const StudentSkills = lazy(() => import("./pages/student/StudentSkills"));
const StudentAchievements = lazy(() => import("./pages/student/StudentAchievements"));

// Pro
const ProDashboard = lazy(() => import("./pages/pro/ProDashboard"));
const ProArena = lazy(() => import("./pages/pro/ProArena"));
const ProRecords = lazy(() => import("./pages/pro/ProRecords"));
const ProProfile = lazy(() => import("./pages/pro/ProProfile"));
const ProShop = lazy(() => import("./pages/pro/ProShop"));

// Freelancer
const FreelancerDashboard = lazy(() => import("./pages/freelancer/FreelancerDashboard"));

// PM
const PMDashboard = lazy(() => import("./pages/pm/PMDashboard"));
const PMClients = lazy(() => import("./pages/pm/PMClients"));
const PMReports = lazy(() => import("./pages/pm/PMReports"));
const PMEarnings = lazy(() => import("./pages/pm/PMEarnings"));
const PMProfile = lazy(() => import("./pages/pm/PMProfile"));

// AI & Notifications & Settings
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/Settings"));

// Non-lazy components
import { AIAssistantFAB } from "./components/AIAssistantFAB";
import { OnboardingGuard } from "./components/OnboardingGuard";
import { DevTestPanel } from "./components/DevTestPanel";

// Loading spinner for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={P("Home", <Index />)} />
                <Route path="/auth/login" element={P("Login", <LoginPage />)} />
                <Route path="/auth/reset-password" element={P("Reset Password", <ResetPasswordPage />)} />
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
                  <Route path="/admin/shop" element={P("Admin Shop", <AdminShop />)} />
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

                {/* Freelancer routes */}
                <Route element={<RoleGuard allowedRoles={['freelancer']}><AppLayout /></RoleGuard>}>
                  <Route path="/freelancer" element={P("Freelancer Dashboard", <FreelancerDashboard />)} />
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
                  <Route path="/parent/child/:childId" element={P("Child Detail", <ParentChildDetail />)} />
                  <Route path="/parent/booking" element={P("Booking", <ParentBooking />)} />
                  <Route path="/parent/financial" element={P("Financial", <ParentFinancials />)} />
                  <Route path="/parent/payments" element={P("Payments", <ParentPayments />)} />
                  <Route path="/parent/coins" element={P("Coins", <ParentCoins />)} />
                  <Route path="/parent/referrals" element={P("Referrals", <ParentReferrals />)} />
                  <Route path="/parent/shop" element={P("Shop", <ParentShop />)} />
                </Route>

                {/* Payment routes */}
                <Route element={<RoleGuard allowedRoles={['parent']}><AppLayout /></RoleGuard>}>
                  <Route path="/payment" element={P("Payment", <PaymentScreen />)} />
                  <Route path="/payment/success" element={P("Payment Success", <PaymentSuccess />)} />
                </Route>

                {/* Chat routes */}
                <Route element={<RoleGuard allowedRoles={['parent', 'coach', 'freelancer', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AppLayout /></RoleGuard>}>
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
                  <Route path="/student/leaderboard" element={P("Leaderboard", <StudentLeaderboard />)} />
                  <Route path="/student/skills" element={P("Skills", <StudentSkills />)} />
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
                <Route path="/ai-assistant" element={<RoleGuard allowedRoles={['parent', 'coach', 'freelancer', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}>{P("AI Assistant", <AIAssistant />)}</RoleGuard>} />

                {/* Notifications & Settings */}
                <Route element={<RoleGuard allowedRoles={['parent', 'coach', 'freelancer', 'student', 'pro_athlete', 'personal_manager', 'admin', 'head_manager']}><AppLayout /></RoleGuard>}>
                  <Route path="/notifications" element={P("Notifications", <NotificationsPage />)} />
                  <Route path="/settings" element={P("Settings", <SettingsPage />)} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <OnboardingGuard />
            <AIAssistantFAB />
            {import.meta.env.DEV && <DevAccountSwitcher />}
            <DevTestPanel />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

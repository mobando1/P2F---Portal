import { lazy, Suspense, useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/currency";
import { ErrorBoundary } from "@/components/error-boundary";
import { isAuthenticated, getCurrentUser, getSmartRedirect, validateSession } from "@/lib/auth";
import HelpButton from "@/components/HelpButton";
import { useWebSocketConnection, useWsQueryInvalidation } from "@/lib/websocket";

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import("@/pages/home"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Login = lazy(() => import("@/pages/login"));
const PackagesPage = lazy(() => import("@/pages/packages"));
const TutorsPage = lazy(() => import("@/pages/tutors"));
const TutorProfilePage = lazy(() => import("@/pages/tutor-profile"));
const BookingConfirmation = lazy(() => import("@/pages/booking-confirmation"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const SubscribePage = lazy(() => import("@/pages/subscribe"));
const ContactPage = lazy(() => import("@/pages/contact"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AIPracticePage = lazy(() => import("@/pages/ai-practice"));
const AdminPage = lazy(() => import("@/pages/admin"));
const TutorDashboardPage = lazy(() => import("@/pages/tutor-dashboard"));
const TutorAvailabilityPage = lazy(() => import("@/pages/tutor-availability"));
const SupportPage = lazy(() => import("@/pages/support"));
const GuidePage = lazy(() => import("@/pages/guide"));
const MessagesPage = lazy(() => import("@/pages/messages"));
const LearningPathPage = lazy(() => import("@/pages/learning-path"));
const PlacementTestPage = lazy(() => import("@/pages/placement-test"));
const NotFound = lazy(() => import("@/pages/not-found"));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    () => (isAuthenticated() ? "authenticated" : "loading"),
  );

  useEffect(() => {
    if (status === "loading") {
      validateSession().then((user) => {
        setStatus(user ? "authenticated" : "unauthenticated");
      });
    }
  }, []);

  if (status === "loading") return <LoadingFallback />;
  if (status === "unauthenticated") return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/home">
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/tutors">
          <ProtectedRoute>
            <TutorsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/tutor/:id">
          <ProtectedRoute>
            <TutorProfilePage />
          </ProtectedRoute>
        </Route>
        <Route path="/booking-confirmation">
          <ProtectedRoute>
            <BookingConfirmation />
          </ProtectedRoute>
        </Route>
        <Route path="/packages">
          <ProtectedRoute>
            <PackagesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/subscription">
          <Redirect to="/packages" />
        </Route>
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/subscribe" component={SubscribePage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/profile">
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/ai-practice">
          <ProtectedRoute>
            <AIPracticePage />
          </ProtectedRoute>
        </Route>
        <Route path="/admin">
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        </Route>
        <Route path="/support">
          <ProtectedRoute>
            <SupportPage />
          </ProtectedRoute>
        </Route>
        <Route path="/guide">
          <ProtectedRoute>
            <GuidePage />
          </ProtectedRoute>
        </Route>
        <Route path="/messages">
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/learning-path">
          <ProtectedRoute>
            <LearningPathPage />
          </ProtectedRoute>
        </Route>
        <Route path="/placement-test">
          <ProtectedRoute>
            <PlacementTestPage />
          </ProtectedRoute>
        </Route>
        <Route path="/tutor-portal">
          <ProtectedRoute>
            <TutorDashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/tutor-portal/availability">
          <ProtectedRoute>
            <TutorAvailabilityPage />
          </ProtectedRoute>
        </Route>
        <Route path="/tutor-portal/classes">
          <ProtectedRoute>
            <TutorDashboardPage />
          </ProtectedRoute>
        </Route>
        <Route path="/">
          <Redirect to={getSmartRedirect(getCurrentUser())} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function WebSocketInit() {
  useWebSocketConnection();
  useWsQueryInvalidation();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <WebSocketInit />
              <Toaster />
              <Router />
              <HelpButton />
            </TooltipProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

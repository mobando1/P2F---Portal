import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import { isAuthenticated } from "@/lib/auth";

import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import SubscriptionPage from "@/pages/subscription";
import PackagesPage from "@/pages/packages";
import TutorsPage from "@/pages/tutors";
import CheckoutPage from "@/pages/checkout";
import SubscribePage from "@/pages/subscribe";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
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
      <Route path="/admin">
        <ProtectedRoute>
          <AdminPage />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        {isAuthenticated() ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

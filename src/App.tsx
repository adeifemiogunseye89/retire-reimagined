import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AdminRoute } from "@/components/AdminRoute";

import { installGlobalErrorHandlers, logPageView } from "@/lib/telemetry";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import Assessment from "./pages/Assessment";
import Dashboard from "./pages/Dashboard";
import ProfileEdit from "./pages/ProfileEdit";
import SecuritySettings from "./pages/SecuritySettings";
import AdminEvents from "./pages/AdminEvents";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminObservability from "./pages/AdminObservability";
import NotFound from "./pages/NotFound";

installGlobalErrorHandlers();

/**
 * Query cache defaults.
 * Financial data must not look stale for long, so staleTime is short (60s) and
 * queries refetch on reconnect. gcTime (v5 name for cacheTime) keeps unmounted
 * data around for 5 minutes so tab switches / revisits render instantly.
 * Refetch-on-focus is off: the dashboard already uses realtime subscriptions.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});


const RouteTelemetry = () => {
  const location = useLocation();
  useEffect(() => { logPageView(location.pathname); }, [location.pathname]);
  return null;
};

/** Redirect to /auth if not logged in */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) {
    const next = window.location.pathname + window.location.search;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <RouteTelemetry />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<ProtectedRoute><AuthCallback /></ProtectedRoute>} />
              <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
              <Route path="/profile/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
              {/* /admin/* additionally requires the server-evaluated `admin` role */}
              <Route path="/admin/events" element={<ProtectedRoute><AdminRoute><AdminEvents /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><AdminUsers /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute><AdminRoute><AdminAnalytics /></AdminRoute></ProtectedRoute>} />
              <Route path="/admin/observability" element={<ProtectedRoute><AdminRoute><AdminObservability /></AdminRoute></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

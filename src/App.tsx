import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useScrollToTop } from "@/hooks/useScrollToTop";

const EducationPage     = lazy(() => import("@/pages/education"));
const LoginPage         = lazy(() => import("@/pages/login"));
const RegisterPage      = lazy(() => import("@/pages/register"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const NotFound          = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      retryDelay: 2000,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
    mutations: { retry: 0 },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}

// FIX: AppInner no longer blocks on auth loading — page renders immediately
// Auth state hydrates in background; user-specific UI updates reactively
function AppInner() {
  const authState = useAuthState();
  useScrollToTop();

  return (
    <AuthContext.Provider value={authState}>
      <Switch>
        <Route path="/login">
          <Suspense fallback={<PageLoader />}><LoginPage /></Suspense>
        </Route>
        <Route path="/register">
          <Suspense fallback={<PageLoader />}><RegisterPage /></Suspense>
        </Route>

        {/* FIX: / is now always accessible — no auth gate */}
        <Route path="/">
          <Layout>
            <Suspense fallback={<PageLoader />}><EducationPage /></Suspense>
          </Layout>
        </Route>
        <Route path="/notifications">
          <Layout>
            <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>
          </Layout>
        </Route>

        <Route>
          <Layout>
            <Suspense fallback={<PageLoader />}><NotFound /></Suspense>
          </Layout>
        </Route>
      </Switch>
      <Toaster />
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppInner />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

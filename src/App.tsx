import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useScrollToTop } from "@/hooks/useScrollToTop";

const EducationPage = lazy(() => import("@/pages/education"));
const LoginPage     = lazy(() => import("@/pages/login"));
const RegisterPage  = lazy(() => import("@/pages/register"));
const NotFound      = lazy(() => import("@/pages/not-found"));

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

function AuthLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-700 flex items-center justify-center animate-pulse">
          <span className="text-white font-black text-base">O</span>
        </div>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}

const BARE_ROUTES = ["/login", "/register"];

function AppInner() {
  const authState = useAuthState();
  useScrollToTop();

  if (authState.isLoading) return <AuthLoader />;

  return (
    <AuthContext.Provider value={authState}>
      <Switch>
        {BARE_ROUTES.map(path => (
          <Route key={path} path={path}>
            <Suspense fallback={<PageLoader />}>
              {path === "/login" && <LoginPage />}
              {path === "/register" && <RegisterPage />}
            </Suspense>
          </Route>
        ))}
        <Route path="/">
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <EducationPage />
            </Suspense>
          </Layout>
        </Route>
        <Route>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
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

import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AdOverlay } from "@/components/AdOverlay";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { supabase } from "@/lib/supabase";

const EducationPage     = lazy(() => import("@/pages/education"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const NotFound          = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, gcTime: 10 * 60_000,
      retry: 1, retryDelay: 2000,
      refetchOnWindowFocus: false, networkMode: "offlineFirst",
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

function getVisitorId(): string {
  const KEY = "otechy_visitor_id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function logPageView() {
  supabase.from("otechy_page_views").insert({ visitor_id: getVisitorId() }).then(({ error }) => {
    if (error) console.warn("[SchoraHub] view log failed:", error.message);
  });
}

function AppInner() {
  const authState = useAuthState();
  useScrollToTop();

  useEffect(() => { logPageView(); }, []);

  return (
    <AuthContext.Provider value={authState}>
      <Switch>
        <Route path="/">
          <Layout><Suspense fallback={<PageLoader />}><EducationPage /></Suspense></Layout>
        </Route>
        <Route path="/notifications">
          <Layout><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></Layout>
        </Route>
        <Route>
          <Layout><Suspense fallback={<PageLoader />}><NotFound /></Suspense></Layout>
        </Route>
      </Switch>
      <Toaster />
      <AdOverlay />
    </AuthContext.Provider>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <QueryClientProvider client={queryClient}>
        {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
        {splashDone  && <AppInner />}
        <InstallPrompt />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
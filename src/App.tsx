import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthContext, useAuthState } from "@/hooks/useAuth";
import { LanguageContext, useLanguageState } from "@/hooks/useLanguage";
import Layout from "@/components/Layout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SplashScreen } from "@/components/SplashScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AdOverlay } from "@/components/AdOverlay";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { supabase } from "@/lib/supabase";
import { generateUUID } from "@/lib/utils";
import { safeGetItem, safeSetItem } from "@/lib/storage";

const EducationPage         = lazy(() => import("@/pages/education"));
const NotificationsPage     = lazy(() => import("@/pages/notifications"));
const BookRequestCenterPage = lazy(() => import("@/pages/BookRequestCenter"));
const SharedPdfViewerPage   = lazy(() => import("@/pages/SharedPdfViewer"));
const NotFound              = lazy(() => import("@/pages/not-found"));

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
      <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
    </div>
  );
}

function getVisitorId(): string {
  // Same key as before, so existing visitors are not double-counted.
  // safeGetItem/safeSetItem never throw (memory fallback in restricted WebViews).
  const KEY = "otechy_visitor_id";
  let id = safeGetItem(KEY);
  if (!id) {
    id = generateUUID();
    safeSetItem(KEY, id);
  }
  return id;
}

// A "view" = someone opening the website/app. We log it:
//   1) when the app first loads, and
//   2) when an installed app/tab is brought back to the front after 30+ min
//      (installed apps stay alive in the background, so without this a person
//      who reopens the app daily would never be counted again).
const VIEW_GAP_MS = 30 * 60 * 1000;
let lastViewLoggedAt = 0;

async function logPageView(force = false) {
  const now = Date.now();
  if (!force && now - lastViewLoggedAt < VIEW_GAP_MS) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  lastViewLoggedAt = now;

  const row = { visitor_id: getVisitorId() };
  let { error } = await supabase.from("otechy_page_views").insert(row);
  if (error) {
    // one quick retry (flaky mobile networks), then give up quietly
    await new Promise(r => setTimeout(r, 1500));
    ({ error } = await supabase.from("otechy_page_views").insert(row));
  }
  if (error) {
    lastViewLoggedAt = 0; // allow another attempt next time
    console.warn("[SchoraHub] view log failed:", error.message);
  }
}

function AppInner() {
  const authState = useAuthState();
  useScrollToTop();

  useEffect(() => {
    logPageView(true);
    const onVisible = () => { if (document.visibilityState === "visible") logPageView(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <AuthContext.Provider value={authState}>
      <Switch>
        <Route path="/">
          <Layout><Suspense fallback={<PageLoader />}><EducationPage /></Suspense></Layout>
        </Route>
        <Route path="/notifications">
          <Layout><Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense></Layout>
        </Route>
        <Route path="/book-request-center">
          <Layout><Suspense fallback={<PageLoader />}><BookRequestCenterPage /></Suspense></Layout>
        </Route>
        <Route path="/shared-pdf">
          <Suspense fallback={<PageLoader />}><SharedPdfViewerPage /></Suspense>
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
  const languageState = useLanguageState();

  return (
    <ErrorBoundary>
      <LanguageContext.Provider value={languageState}>
        <OfflineBanner />
        <QueryClientProvider client={queryClient}>
          {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
          {splashDone  && <AppInner />}
          <InstallPrompt />
        </QueryClientProvider>
      </LanguageContext.Provider>
    </ErrorBoundary>
  );
}
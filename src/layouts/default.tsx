import { useEffect, useState } from "react";
import Footer from "@/components/Footer/Footer";
import FirebaseInitializer from "@/components/Functional/FirebaseInitializer";
import { Navbar } from "@/components/navbar";
import { getSpecificSettings, isSSR } from "@/helpers/getters";
import { getSettings } from "@/routes/api";
import { Settings, SystemSettings } from "@/types/ApiResponse";
import useSWR from "swr";
import { SEOHead } from "../SEO/SEOHead";
import GoogleMapsHeadScript from "@/components/Location/GoogleMapsScriptLoader";
import { SettingsProvider } from "@/contexts/SettingsContext";
import WebMaintenanceMode from "@/components/custom/WebMaintenanceMode";
import ScrollToTopButton from "@/components/Functional/ScrollToTopButton";
import { onAppLoad } from "@/helpers/events";
import OfflinePage from "@/components/OfflinePage";
import { maintenanceStore } from "@/stores/maintenanceStore";
import { SpeedInsights } from "@vercel/speed-insights/next";
import dynamic from "next/dynamic";
const BottomNavigation = dynamic(
  () => import("@/components/Functional/BottomNavigation"),
  { ssr: false },
);
import CookieConsent from "@/components/Functional/CookieConsent";
import { store } from "@/lib/redux/store";
import { getCookie } from "@/lib/cookies";
import { handleLogout } from "@/helpers/auth";
const RemovedItemsModal = dynamic(
  () => import("@/components/Modals/RemovedItemsModal"),
  { ssr: false },
);
const FailedItemsModal = dynamic(
  () => import("@/components/Modals/FailedItemsModal"),
  { ssr: false },
);
const DeepLinkModal = dynamic(
  () => import("@/components/Modals/DeepLinkModal"),
  { ssr: false },
);

export default function DefaultLayout({
  children,
  initialSettings,
}: {
  children?: React.ReactNode;
  initialSettings?: Settings | null;
}) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [maintenanceState, setMaintenanceState] = useState(
    maintenanceStore.getState(),
  );

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    // defer initial setState to next tick
    const id = requestAnimationFrame(updateOnlineStatus);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetcher = async () => {
    try {
      const res = await getSettings();
      if (res.success && res.data) {
        return res.data;
      } else {
        console.error("Failed to fetch settings:", res.message);
        return null;
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
      return null;
    }
  };

  const { data: settings, isLoading } = useSWR<Settings | null>(
    "/settings",
    fetcher,
    {
      revalidateOnMount: !isSSR(),
      revalidateOnFocus: true,
      focusThrottleInterval: 30000,
      revalidateOnReconnect: true,
      refreshInterval: 5 * 60 * 1000,
      fallbackData: initialSettings ?? null,
    },
  );

  const activeSettings: Settings | null = settings ?? null;

  useEffect(() => {
    if (!isLoading) {
      onAppLoad();
    }
  }, [isLoading]);

  // Subscribe to maintenance store changes
  useEffect(() => {
    const unsubscribe = maintenanceStore.subscribe(() => {
      setMaintenanceState(maintenanceStore.getState());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (store.getState().auth.isLoggedIn) return;
    const accessToken = getCookie("access_token") as string | undefined;
    if (accessToken) {
      handleLogout(false, true);
    }
  }, []);

  const systemSettings: SystemSettings | undefined = getSpecificSettings(
    activeSettings,
    "system",
  ) as SystemSettings | undefined;

  // Priority 1: Check 503-based maintenance, Priority 2: Check settings API
  const isMaintenanceMode =
    maintenanceState.isActive || systemSettings?.webMaintenanceMode || false;

  // Priority 1: Use 503 message, Priority 2: Use settings API message
  const maintenanceMessage =
    maintenanceState.message || systemSettings?.webMaintenanceMessage || null;

  return (
    <div className="flex flex-col min-h-screen w-full items-center">
      {!isOnline ? (
        <OfflinePage />
      ) : isLoading && !isSSR() ? (
        <div className="relative h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-white">
          {/* Smoke */}
          <div className="absolute left-1/2 top-1/2 -translate-x-24 translate-y-4 flex gap-2">
            <span className="smoke" />
            <span className="smoke delay-150" />
            <span className="smoke delay-300" />
          </div>
          {/* Bike GIF */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/logo-loading.gif"
            alt="Loading"
            className="relative z-10 w-32 h-32"
            loading="eager"
          />
          {/* Road */}
          <div className="absolute bottom-[45%] w-72 h-0.5 overflow-hidden hidden">
            <div className="road" />
          </div>
        </div>
      ) : (
        <>
          {activeSettings && (
            <>
              <FirebaseInitializer settings={activeSettings} />
              <SEOHead settings={activeSettings} />
              <GoogleMapsHeadScript settings={activeSettings} />
            </>
          )}

          <SettingsProvider settings={activeSettings}>
            {/* Check if maintenance mode is enabled (503-based or settings API) */}
            {isMaintenanceMode ? (
              // Show only maintenance page when maintenance mode is active
              <WebMaintenanceMode customMessage={maintenanceMessage} />
            ) : (
              // Show normal layout with navbar, content, and footer
              <>
                <Navbar />
                <main className="w-full max-w-384 min-h-[80vh] px-2 md:px-6 grow pb-4">
                  {children}
                </main>
                <Footer />
                <ScrollToTopButton />
                <BottomNavigation />
                <CookieConsent />
                <RemovedItemsModal />
                <FailedItemsModal />
                <DeepLinkModal />
              </>
            )}
          </SettingsProvider>
        </>
      )}

      <SpeedInsights />
    </div>
  );
}

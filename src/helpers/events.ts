import { store } from "@/lib/redux/store";
import { updateCartData } from "./updators";
import { getCookie, setCookie } from "@/lib/cookies";
import { UserLocation } from "@/components/Location/types/LocationAutoComplete.types";
import { addToast } from "@heroui/react";
import { clearRecentlyViewed } from "@/lib/redux/slices/recentlyViewedSlice";
import { photonReverseLabel } from "@/lib/photonGeocode";
import { staticLat, staticLng } from "@/config/constants";

export const onLocationChange = () => {
  if (typeof window === "undefined") return;

  // Clear recently viewed products when location changes
  store.dispatch(clearRecentlyViewed());

  const pathButtonMap: Record<string, string[]> = {
    "/": [
      "home-products-refetch",
      "home-sections-refetch",
      "home-stores-refetch",
      "home-banners-refetch",
      "home-brands-refetch",
      "home-categories-refetch",
      "home-category-tabs",
    ],
    "/stores": ["refetch-store-page"],
    "/feature-sections": ["refetch-sections-page"],
    "/cart": ["refetch-cart-page", "refetch-similar-products"],
    "/categories": ["refetch-categories-page"],
    "/shopping-list": ["shopping-list-refetch"],
    "/brands": ["refetch-brands-page"],
  };

  const normalizePath = (path: string) =>
    path !== "/" ? path.replace(/\/+$/, "") : "/";

  const currentPath = normalizePath(window.location.pathname);

  let buttonIds: string[] = [];

  if (currentPath.startsWith("/feature-sections/")) {
    // Handle dynamic slug
    buttonIds = ["refetch-section-products"];
  } else if (currentPath.startsWith("/products/") || currentPath.startsWith("/share/products/")) {
    buttonIds = ["similar-products-refetch", "specific-product-refetch"];
  } else if (currentPath.startsWith("/brands/")) {
    buttonIds = ["refetch-brand-products"];
  } else if (currentPath.startsWith("/categories/")) {
    buttonIds = ["category-products-refetch"];
  } else if (currentPath.startsWith("/stores/")) {
    buttonIds = ["refetch-store-products"];
  } else {
    // Handle exact matches
    buttonIds = pathButtonMap[currentPath] || [];
  }

  buttonIds.forEach((id) => document.getElementById(id)?.click?.());

  updateCartData(false, false, 0, false);
};

const shouldAutoRefreshLocation = (userLocation?: UserLocation | null) => {
  if (!userLocation) return true;

  // If userLocation is still the hardcoded fallback, replace it with real device location.
  const isStaticFallback =
    Math.abs(userLocation.lat - staticLat) < 1e-6 &&
    Math.abs(userLocation.lng - staticLng) < 1e-6;

  const name = (userLocation.placeName || "").trim().toLowerCase();
  const isPlaceholderName =
    name === "selected location" ||
    name === "shared location" ||
    name.includes("bhuj") ||
    name === "current location";

  return isStaticFallback || isPlaceholderName;
};

const trySetUserLocationFromBrowser = async (): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  if (!("geolocation" in navigator)) return false;

  // If the browser already knows it's denied, don't spam prompts.
  try {
    const permissions = (navigator as any).permissions as
      | { query: (p: any) => Promise<{ state: "granted" | "prompt" | "denied" }> }
      | undefined;
    if (permissions?.query) {
      const res = await permissions.query({ name: "geolocation" });
      if (res?.state === "denied") return false;
    }
  } catch {
    // ignore – Permissions API not available/blocked
  }

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  });

  if (!position) return false;

  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  let placeName = "Current location";
  try {
    const rev = await photonReverseLabel(lat, lng);
    if (rev?.placeName) placeName = rev.placeName;
  } catch {
    // ignore reverse geocode failures; coords still help API queries
  }

  const newUserLocation: UserLocation = {
    lat,
    lng,
    placeName,
    placeDescription: "",
  };

  setCookie("userLocation", newUserLocation);
  onLocationChange();
  return true;
};

export const onAppLoad = async () => {
  const path = typeof window !== "undefined" ? window.location.pathname : "";

  // 1. Check for location in URL params (deep link support)
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLat = urlParams.get("lat");
    const urlLng = urlParams.get("lng");

    if (urlLat && urlLng) {
      const currentUserLocation = getCookie("userLocation");
      if (!currentUserLocation) {
        const newUserLocation: UserLocation = {
          lat: parseFloat(urlLat),
          lng: parseFloat(urlLng),
          placeName: "Shared Location",
          placeDescription: "",
        };
        setCookie("userLocation", newUserLocation);
        // Location changed via URL, trigger refetch for current page components
        onLocationChange();
      }
    }
  }

  if (store.getState().auth.isLoggedIn) {
    if (path !== "/cart" && path !== "/cart/") {
      updateCartData(true, false);
    }
  }

  const userLocation = getCookie("userLocation") as UserLocation;

  // If location missing (or obviously fallback), try browser geolocation first.
  if (shouldAutoRefreshLocation(userLocation || null)) {
    const setFromBrowser = await trySetUserLocationFromBrowser();
    if (setFromBrowser) {
      addToast({ color: "success", title: "Location detected automatically" });
      return;
    }
  }

  if (!userLocation) {
    // Fallback: open location modal if still no location is set
    document.getElementById("location-modal-btn")?.click();
    addToast({ color: "default", title: "Please Select Location First !" });
  }
};

export const onHomeCategoryChange = () => {
  if (typeof window === "undefined") return;

  const pathButtonMap: Record<string, string[]> = {
    "/": [
      "home-banners-refetch",
      "home-brands-refetch",
      "home-categories-refetch",
      "home-products-refetch",
      "home-sections-refetch",
    ],
  };

  const normalizePath = (path: string) =>
    path !== "/" ? path.replace(/\/+$/, "") : "/";

  const currentPath = normalizePath(window.location.pathname);

  let buttonIds: string[] = [];

  buttonIds = pathButtonMap[currentPath] || [];

  buttonIds.forEach((id) => document.getElementById(id)?.click?.());
};

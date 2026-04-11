import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  addToast,
  Alert,
} from "@heroui/react";
import { ChevronDown, MapPin } from "lucide-react";
import LocationAutoComplete from "./LocationAutoComplete";
import GoogleMap from "./GoogleMap";
import { UserLocation } from "./types/LocationAutoComplete.types";
import { getCookie, setCookie } from "@/lib/cookies";
import { handleCheckZone } from "@/helpers/functionalHelpers";
import { useSettings } from "@/contexts/SettingsContext";
import { onLocationChange } from "@/helpers/events";
import { useTranslation } from "react-i18next";
import useSWR, { mutate } from "swr";
import { staticLat, staticLng } from "@/config/constants";
import { hasGoogleMapsKey } from "@/helpers/mapProvider";
import { photonReverseLabel } from "@/lib/photonGeocode";
import { debounce } from "lodash";
import { useMemo } from "react";
import { getDeliveryZones, getStoresByMap } from "@/routes/api";
import { Store } from "@/types/ApiResponse";

// Define the ref interface (should match LocationAutoComplete)
interface LocationAutoCompleteRef {
  setInputValue: (value: string) => void;
}

const LocationSelector = () => {
  const { defaultLocation, demoMode, systemSettings, isSingleVendor, webSettings } =
    useSettings();
  const { t } = useTranslation();
  const [selectedLatLng, setSelectedLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(defaultLocation);

  const [selectedLocation, setSelectedLocation] = useState<{
    placeName: string;
    latLng: { lat: number; lng: number };
    placeDescription: string;
  } | null>(null);

  // Temporary state for modal - only updates main state when confirmed
  const [tempSelectedLatLng, setTempSelectedLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [tempSelectedLocation, setTempSelectedLocation] = useState<{
    placeName: string;
    latLng: { lat: number; lng: number };
    placeDescription: string;
  } | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [deliveryCheckLoading, setDeliveryCheckLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Fetch delivery zones only when modal is open AND map is loaded properly
  const { data: zonesData } = useSWR(
    isOpen && mapLoaded ? "delivery-zones" : null,
    () => getDeliveryZones({ per_page: 100 }),
  );
  const zones = zonesData?.success ? zonesData.data.data : [];

  // Create a ref for LocationAutoComplete
  const autocompleteRef = useRef<LocationAutoCompleteRef>(null);

  // Initialize component with cookie data
  useEffect(() => {
    const initializeLocation = () => {
      try {
        const userLocation = getCookie("userLocation") as UserLocation;

        if (userLocation && userLocation.lat && userLocation.lng) {
          const locationData = {
            placeName: userLocation.placeName || "Selected Location",
            latLng: { lat: userLocation.lat, lng: userLocation.lng },
            placeDescription: userLocation.placeDescription || "",
          };

          setSelectedLatLng(locationData.latLng);
          setSelectedLocation(locationData);
        }
      } catch (error) {
        console.error("Error initializing location from cookie:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initializeLocation();
  }, []);

  // Initialize temp state when modal opens.
  // Do not include temp state in deps, otherwise user-picked temp values get reset.
  useEffect(() => {
    if (!isOpen) return;

    setTempSelectedLatLng(selectedLatLng);
    setTempSelectedLocation(selectedLocation);
    setMapLoaded(false); // Reset map loaded state when opening modal

    // Update autocomplete input when modal opens
    if (selectedLocation && autocompleteRef.current) {
      setTimeout(() => {
        if (autocompleteRef.current) {
          autocompleteRef.current.setInputValue(selectedLocation.placeName);
        }
      }, 100);
    }
  }, [isOpen, selectedLatLng, selectedLocation]);

  const handleLocationSelect = async (location: {
    placeName: string;
    latLng: { lat: number; lng: number };
    placeDescription: string;
  }) => {
    // First update the modal location immediately for good UX
    setTempSelectedLatLng(location.latLng);
    setTempSelectedLocation(location);

    setDeliveryCheckLoading(true);

    try {
      const res = await handleCheckZone(
        location.latLng.lat,
        location.latLng.lng
      );

      if (res) {
        addToast({
          title: t("locationSelector.deliveryAvailable"),
          color: "success",
        });
      } else {
        addToast({
          title: t("locationSelector.deliveryNotAvailable"),
          color: "danger",
          description: t("locationSelector.deliveryNotAvailableDescription"),
        });
      }
    } catch (error) {
      console.error("Error checking delivery zone:", error);
      addToast({
        title: "Error checking delivery zone",
        color: "danger",
        description: "Please try again",
      });
    } finally {
      setDeliveryCheckLoading(false);
    }
  };

  // Helper function to wait for Google Maps API to load
  const waitForGoogleMaps = (timeout = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkGoogleMaps = () => {
        if (window.google?.maps?.Geocoder) {
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          resolve(false);
        } else {
          setTimeout(checkGoogleMaps, 200);
        }
      };

      checkGoogleMaps();
    });
  };

  const handleMapLocationUpdate = useCallback(
    async (
      latLng: {
        lat: number;
        lng: number;
      },
      renderToast: boolean = true,
    ) => {
      let placeName = "";

      if (hasGoogleMapsKey(webSettings)) {
        const isLoaded = await waitForGoogleMaps();
        if (!isLoaded) {
          console.warn("Google Maps API failed to load");
          return;
        }
        try {
          const geocoder = new window.google.maps.Geocoder();
          const result = await geocoder.geocode({ location: latLng });
          if (!result?.results[0]) return;
          placeName = result.results[0].formatted_address;
        } catch (error) {
          console.error("Error geocoding map location:", error);
          addToast({
            title: "Error processing location",
            color: "danger",
            description: "Please try again",
          });
          return;
        }
      } else {
        const rev = await photonReverseLabel(latLng.lat, latLng.lng);
        placeName =
          rev?.placeName ||
          `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
      }

      setDeliveryCheckLoading(true);

      try {
        const newLocation = {
          placeName,
          latLng,
          placeDescription: "",
        };

        setTempSelectedLatLng(latLng);
        setTempSelectedLocation(newLocation);

        if (autocompleteRef.current) {
          autocompleteRef.current.setInputValue(newLocation.placeName);
        }

        const res = await handleCheckZone(latLng.lat, latLng.lng);

        if (res) {
          if (renderToast) {
            addToast({ title: "Delivery Available", color: "success" });
          }
        } else {
          addToast({
            title: "Delivery Not Available",
            color: "danger",
            description:
              "You can continue browsing or select a different location",
          });
        }
      } catch (error) {
        console.error("Error processing map location:", error);
        addToast({
          title: "Error processing location",
          color: "danger",
          description: "Please try again",
        });
      } finally {
        setDeliveryCheckLoading(false);
      }
    },
    [webSettings],
  );

  const handleConfirmLocation = async () => {
    if (tempSelectedLocation && tempSelectedLatLng) {
      // Check delivery one more time before confirming
      setDeliveryCheckLoading(true);

      try {
        const res = await handleCheckZone(
          demoMode ? defaultLocation?.lat || staticLat : tempSelectedLatLng.lat,
          demoMode ? defaultLocation?.lng || staticLng : tempSelectedLatLng.lng
        );

        if (res) {
          // Prepare the final location data based on demoMode
          const finalLatLng = demoMode
            ? {
                lat: defaultLocation?.lat || staticLat,
                lng: defaultLocation?.lng || staticLng,
              }
            : tempSelectedLatLng;

          const finalLocation = demoMode
            ? {
                placeName: "Bhuj ,Gujrat ,India",
                latLng: finalLatLng,
                placeDescription: "",
              }
            : tempSelectedLocation;

          // Update main state with the final values
          setSelectedLatLng(finalLatLng);
          setSelectedLocation(finalLocation);

          // Save to cookie
          const userLocation: UserLocation = {
            lat: finalLatLng.lat,
            lng: finalLatLng.lng,
            placeName: finalLocation.placeName,
            placeDescription: finalLocation.placeDescription,
          };

          setCookie<UserLocation>("userLocation", userLocation);

          // Revalidate ALL SWR Cache
          await mutate((key) => key !== "/settings", undefined, {
            revalidate: true,
          });

          onLocationChange();

          onClose();

          addToast({
            title: "Location confirmed successfully",
            color: "success",
          });
        } else {
          addToast({
            title: "Cannot confirm location",
            color: "danger",
            description: "Delivery not available at this location",
          });
        }
      } catch (error) {
        console.error("Error confirming location:", error);
        addToast({
          title: "Error confirming location",
          color: "danger",
          description: "Please try again",
        });
      } finally {
        setDeliveryCheckLoading(false);
      }
    }
  };

  // Debounce API call to prevent laggy behavior during zoom/pan
  const debouncedFetchStores = useMemo(
    () =>
      debounce(
        async (bounds: {
          ne: { lat: number; lng: number };
          sw: { lat: number; lng: number };
        }) => {
          if (isSingleVendor) return;
          try {
            const res = await getStoresByMap({
              ne_lat: bounds.ne.lat,
              ne_lng: bounds.ne.lng,
              sw_lat: bounds.sw.lat,
              sw_lng: bounds.sw.lng,
            });

            if (res.success && res.data) {
              setStores(res.data.stores);
            }
          } catch (error) {
            console.error("Error fetching stores by map:", error);
          }
        },
        500, // 500ms delay
      ),
    [isSingleVendor],
  );

  const handleBoundsChange = useCallback(
    (bounds: {
      ne: { lat: number; lng: number };
      sw: { lat: number; lng: number };
    }) => {
      if (isSingleVendor) return;
      debouncedFetchStores(bounds);
    },
    [debouncedFetchStores, isSingleVendor],
  );

  const handleZoomChange = useCallback(() => {
    // Handle zoom change if needed
  }, []);

  const handleCloseModal = () => {
    if (selectedLocation) {
      // Reset temp state to current main state
      setTempSelectedLatLng(selectedLatLng);
      setTempSelectedLocation(selectedLocation);
      onClose();
    } else {
      addToast({
        color: "danger",
        title: "Please Confirm Location to Continue !",
      });
    }
  };

  // Get display text for the button
  const getButtonText = () => {
    if (!isInitialized) return t("locationSelector.getting");
    if (selectedLocation) {
      const displayText = selectedLocation.placeDescription
        ? `${selectedLocation.placeName}, ${selectedLocation.placeDescription}`
        : selectedLocation.placeName;
      return displayText.length > 30
        ? `${displayText.substring(0, 30)}...`
        : displayText;
    }
    return t("locationSelector.selectLocation");
  };

  return (
    <div>
      <button
        id="location-modal-btn"
        onClick={() => {
          onOpen();
          if (defaultLocation) {
            // Call after modal opens and map loads
            handleMapLocationUpdate(defaultLocation, false);
          }
        }}
      />
      <Button
        disableRipple
        color={
          !isInitialized ? "warning" : selectedLocation ? undefined : "primary"
        }
        variant={selectedLocation ? "flat" : "flat"}
        onPress={onOpen}
        className="p-0 py-0 bg-transparent max-w-full"
        startContent={<MapPin width={16} />}
        endContent={<ChevronDown width={16} />}
        isDisabled={!isInitialized}
        fullWidth
      >
        <span className="truncate text-left flex-1">{getButtonText()}</span>
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={handleCloseModal}
        scrollBehavior="inside"
        isDismissable={selectedLocation ? true : false}
        classNames={{
          base: "w-full",
          body: "px-2 md:px-4",
          header: "p-3 sm:p-4",
        }}
        size="2xl"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex justify-between items-center">
            <span>{t("locationSelector.modalTitle")}</span>
          </ModalHeader>
          <ModalBody>
            <LocationAutoComplete
              onLocationSelect={handleLocationSelect}
              ref={autocompleteRef}
              initialLocation={tempSelectedLocation}
            />
            <GoogleMap
              latLng={tempSelectedLatLng}
              onLocationUpdate={handleMapLocationUpdate}
              onBoundsChange={isSingleVendor ? undefined : handleBoundsChange}
              onZoomChange={isSingleVendor ? undefined : handleZoomChange}
              stores={isSingleVendor ? [] : stores}
              zones={zones}
              onMapLoad={() => setMapLoaded(true)}
              disableRedirect={!selectedLocation}
            />
          </ModalBody>
          <ModalFooter className="flex items-center flex-col sm:flex-row justify-between">
            <div className="flex-1">
              {demoMode && (
                <Alert
                  color="warning"
                  title={
                    systemSettings?.customerLocationDemoModeMessage
                      ? systemSettings?.customerLocationDemoModeMessage
                      : "Demo mode is enabled. Location will default automatically."
                  }
                  variant="faded"
                  classNames={{
                    title: "text-xs",
                    base: "py-0 max-w-fit",
                    alertIcon: "w-5",
                    iconWrapper: "w-5 h-5",
                  }}
                />
              )}
            </div>

            <Button
              color="primary"
              onPress={handleConfirmLocation}
              isDisabled={!tempSelectedLocation || deliveryCheckLoading}
              isLoading={deliveryCheckLoading}
            >
              {deliveryCheckLoading
                ? t("locationSelector.checking")
                : t("locationSelector.confirmLocation")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default LocationSelector;

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GoogleMapProps } from "./types/GoogleMap.types";
import StoreMarkerPopup from "./StoreMarkerPopup";
import { Store } from "@/types/ApiResponse";
import { TILE_LAYERS, staticLat, staticLng } from "@/config/constants";

const SAME_LOCATION_THRESHOLD = 0.00005;
const STORE_MARKER_OFFSET = 0.00015;

function isSameLocation(
  storeLat: number,
  storeLng: number,
  current: { lat: number; lng: number },
): boolean {
  return (
    Math.abs(storeLat - current.lat) <= SAME_LOCATION_THRESHOLD &&
    Math.abs(storeLng - current.lng) <= SAME_LOCATION_THRESHOLD
  );
}

function getStoreMarkerPosition(
  storeLat: number,
  storeLng: number,
  currentLatLng: { lat: number; lng: number } | null,
): [number, number] {
  if (currentLatLng && isSameLocation(storeLat, storeLng, currentLatLng)) {
    return [storeLat + STORE_MARKER_OFFSET, storeLng + STORE_MARKER_OFFSET];
  }
  return [storeLat, storeLng];
}

const mainMarkerIcon = L.divIcon({
  className: "osm-main-marker",
  html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#ef4444;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);margin:-12px 0 0 -12px;"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

export default function OsmMap(props: GoogleMapProps) {
  const {
    latLng,
    onLocationUpdate,
    onBoundsChange,
    onZoomChange,
    height = 400,
    stores = [],
    zones = [],
    onMapLoad,
    disableRedirect,
  } = props;

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const zoneLayersRef = useRef<L.Layer[]>([]);
  const storeMarkersRef = useRef<L.Marker[]>([]);
  const storeDataMapRef = useRef<Map<number, Store>>(new Map());
  const isDragging = useRef(false);
  const isMarkerClickRef = useRef(false);
  const isPopupOpenRef = useRef(false);
  const callbacksRef = useRef({
    onBoundsChange,
    onZoomChange,
    onLocationUpdate,
    onMapLoad,
  });

  useEffect(() => {
    callbacksRef.current = {
      onBoundsChange,
      onZoomChange,
      onLocationUpdate,
      onMapLoad,
    };
  }, [onBoundsChange, onZoomChange, onLocationUpdate, onMapLoad]);

  const [hoveredStore, setHoveredStore] = useState<Store | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const setHoveredStoreWrap = useCallback((s: Store | null) => {
    isPopupOpenRef.current = !!s;
    setHoveredStore(s);
  }, []);

  const emitBounds = useCallback(() => {
    const m = mapInstance.current;
    if (!m || !callbacksRef.current.onBoundsChange) return;
    const b = m.getBounds();
    callbacksRef.current.onBoundsChange({
      ne: { lat: b.getNorthEast().lat, lng: b.getNorthEast().lng },
      sw: { lat: b.getSouthWest().lat, lng: b.getSouthWest().lng },
    });
    if (callbacksRef.current.onZoomChange) {
      callbacksRef.current.onZoomChange(m.getZoom());
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const center: [number, number] = [staticLat, staticLng];

    const map = L.map(mapRef.current, {
      center,
      zoom: 16,
      zoomControl: true,
    });
    mapInstance.current = map;

    const tile = L.tileLayer(TILE_LAYERS[0], {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    tile.addTo(map);
    tileRef.current = tile;

    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (isMarkerClickRef.current) {
        isMarkerClickRef.current = false;
        return;
      }
      if (isPopupOpenRef.current) {
        setHoveredStoreWrap(null);
        return;
      }
      if (isDragging.current) return;
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const mk = L.marker([lat, lng], {
          icon: mainMarkerIcon,
          draggable: true,
        }).addTo(map);
        markerRef.current = mk;
        mk.on("dragstart", () => {
          isDragging.current = true;
          setHoveredStoreWrap(null);
        });
        mk.on("dragend", (ev) => {
          const p = ev.target.getLatLng();
          isDragging.current = false;
          callbacksRef.current.onLocationUpdate?.({ lat: p.lat, lng: p.lng });
        });
      }
      callbacksRef.current.onLocationUpdate?.({ lat, lng });
    });

    if (callbacksRef.current.onMapLoad) callbacksRef.current.onMapLoad();
    emitBounds();

    return () => {
      map.remove();
      mapInstance.current = null;
      markerRef.current = null;
      tileRef.current = null;
    };
  }, [emitBounds, setHoveredStoreWrap]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !latLng) return;
    if (!markerRef.current) {
      const mk = L.marker([latLng.lat, latLng.lng], {
        icon: mainMarkerIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = mk;
      mk.on("dragstart", () => {
        isDragging.current = true;
        setHoveredStoreWrap(null);
      });
      mk.on("dragend", (ev) => {
        const p = ev.target.getLatLng();
        isDragging.current = false;
        callbacksRef.current.onLocationUpdate?.({ lat: p.lat, lng: p.lng });
      });
      map.panTo([latLng.lat, latLng.lng]);
      return;
    }
    if (!isDragging.current) {
      const cur = markerRef.current.getLatLng();
      if (
        Math.abs(cur.lat - latLng.lat) > 0.00002 ||
        Math.abs(cur.lng - latLng.lng) > 0.00002
      ) {
        markerRef.current.setLatLng([latLng.lat, latLng.lng]);
        map.panTo([latLng.lat, latLng.lng]);
      }
    }
  }, [latLng, setHoveredStoreWrap]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    zoneLayersRef.current.forEach((l) => map.removeLayer(l));
    zoneLayersRef.current = [];

    zones.forEach((zone: {
      center_latitude: string;
      center_longitude: string;
      boundary_json?: unknown;
      radius_km?: number;
    }) => {
      const centerLat = parseFloat(zone.center_latitude);
      const centerLng = parseFloat(zone.center_longitude);
      let raw: { lat: number; lng: number }[] | null = null;
      if (zone.boundary_json) {
        try {
          raw =
            Array.isArray(zone.boundary_json) ?
              (zone.boundary_json as { lat: number; lng: number }[])
            : (JSON.parse(String(zone.boundary_json)) as { lat: number; lng: number }[]);
        } catch {
          raw = null;
        }
      }
      if (raw && raw.length > 0) {
        const paths = raw.map((pt) => [pt.lat, pt.lng] as [number, number]);
        const poly = L.polygon(paths, {
          color: "#4F46E5",
          weight: 2,
          opacity: 0.85,
          fillColor: "#4F46E5",
          fillOpacity: 0.35,
        });
        poly.addTo(map);
        zoneLayersRef.current.push(poly);
      } else if (zone.radius_km) {
        const circle = L.circle([centerLat, centerLng], {
          radius: Number(zone.radius_km) * 1000,
          color: "#4F46E5",
          weight: 2,
          opacity: 0.85,
          fillColor: "#4F46E5",
          fillOpacity: 0.35,
        });
        circle.addTo(map);
        zoneLayersRef.current.push(circle);
      }
    });
  }, [zones]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    storeMarkersRef.current.forEach((m) => map.removeLayer(m));
    storeMarkersRef.current = [];
    storeDataMapRef.current.clear();

    const validStores = stores.filter(
      (s: Store) => s.id && (s.lat || s.latitude),
    );
    validStores.forEach((store: Store) => {
      const slat = Number(store.lat || store.latitude);
      const slng = Number(store.lng || store.longitude);
      if (Number.isNaN(slat) || Number.isNaN(slng)) return;
      storeDataMapRef.current.set(store.id, store);
      const pos = getStoreMarkerPosition(
        slat,
        slng,
        latLng ? { lat: latLng.lat, lng: latLng.lng } : null,
      );
      const icon = L.icon({
        iconUrl: "/logos/store-icon.png",
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        className: "osm-store-icon",
      });
      const mk = L.marker(pos, { icon }).addTo(map);
      mk.on("click", (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        isMarkerClickRef.current = true;
        const el = mapRef.current;
        if (!el) return;
        const pt = map.latLngToContainerPoint(mk.getLatLng());
        setPopupPosition({ x: pt.x, y: pt.y });
        setHoveredStoreWrap(storeDataMapRef.current.get(store.id) || store);
        setTimeout(() => {
          isMarkerClickRef.current = false;
        }, 300);
      });
      storeMarkersRef.current.push(mk);
    });
  }, [stores, latLng, setHoveredStoreWrap]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ height: `${height}px` }}
    >
      <div ref={mapRef} className="bg-gray-100 w-full h-full z-0" />
      {hoveredStore && (
        <StoreMarkerPopup
          store={hoveredStore}
          position={popupPosition}
          mapHeight={height}
          disableRedirect={disableRedirect}
        />
      )}
    </div>
  );
}

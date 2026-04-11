import { FC, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DeliveryZone } from "@/types/ApiResponse";
import { useSettings } from "@/contexts/SettingsContext";
import { TILE_LAYERS } from "@/config/constants";

interface OsmMapForZoneProps {
  zone: DeliveryZone;
  className?: string;
}

const OsmMapForZone: FC<OsmMapForZoneProps> = ({
  zone,
  className = "",
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);

  const { currencySymbol } = useSettings();

  useEffect(() => {
    if (!mapRef.current || !zone) return;

    const centerLat = parseFloat(zone.center_latitude);
    const centerLng = parseFloat(zone.center_longitude);
    const center: [number, number] = [centerLat, centerLng];

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
      });
      L.tileLayer(TILE_LAYERS[0], {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView(center, 13);
    }

    const map = mapInstance.current;
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    let raw: { lat: number; lng: number }[] | null = null;
    if (zone.boundary_json) {
      try {
        raw =
          Array.isArray(zone.boundary_json) ?
            zone.boundary_json
          : (JSON.parse(String(zone.boundary_json)) as { lat: number; lng: number }[]);
      } catch {
        raw = null;
      }
    }

    const popupHtml = `
      <div class="p-2 min-w-[200px] text-gray-800">
        <div class="font-semibold mb-2">${zone.name}</div>
        <div class="text-sm text-gray-600">
          <p>Delivery Charges: ${currencySymbol} ${zone.regular_delivery_charges}</p>
          ${zone.rush_delivery_enabled ? `<p>Rush Delivery: ${currencySymbol} ${zone.rush_delivery_charges}</p>` : ""}
          ${zone.free_delivery_amount ? `<p>Free Delivery Above: ${currencySymbol} ${zone.free_delivery_amount}</p>` : ""}
        </div>
      </div>
    `;

    if (raw && raw.length > 0) {
      const paths = raw.map((p) => [p.lat, p.lng] as [number, number]);
      const poly = L.polygon(paths, {
        color: "#4F46E5",
        weight: 2,
        fillColor: "#4F46E5",
        fillOpacity: 0.35,
      }).addTo(map);
      layersRef.current.push(poly);
      map.fitBounds(poly.getBounds(), { padding: [24, 24] });
    } else if (zone.radius_km) {
      const circle = L.circle(center, {
        radius: zone.radius_km * 1000,
        color: "#4F46E5",
        weight: 2,
        fillColor: "#4F46E5",
        fillOpacity: 0.35,
      }).addTo(map);
      layersRef.current.push(circle);
      map.fitBounds(circle.getBounds(), { padding: [24, 24] });
    }

    const mk = L.marker(center).addTo(map);
    layersRef.current.push(mk);
    mk.bindPopup(popupHtml).openPopup();
  }, [zone, currencySymbol]);

  useEffect(() => {
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className={`bg-gray-100 rounded-lg w-full h-[400px] ${className}`}
    />
  );
};

export default OsmMapForZone;

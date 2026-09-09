import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, MapPin, Navigation, Maximize2, ShieldCheck, AlertTriangle, Layers, Crosshair } from "lucide-react";
import { Button } from "../../components/ui";

// Client-side Google Encoded Polyline decoder
function decodePolyline(encoded) {
  if (!encoded) return [];
  const poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
}

// 100% Free Tile Layers with ZERO API Keys and NO Watermarks
const TILE_LAYERS = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  humanitarian: {
    name: "High-Contrast Roads",
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics",
    maxZoom: 18,
  },
};

export default function ShipmentTrackingMap({
  origin,
  destination,
  currentLocation,
  route,
  trail = [],
  trackingStatus = "WAITING_FOR_SIGNAL",
  shipmentNumber,
  autoFollow = true,
  onToggleAutoFollow,
}) {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({ origin: null, destination: null, vehicle: null });
  const linesRef = useRef({ planned: null, trail: null });

  // Default to standard OpenStreetMap (zero watermarks)
  const [activeTile, setActiveTile] = useState("osm");

  const originLat = origin?.latitude || 16.2120;
  const originLng = origin?.longitude || 77.3439;
  const destLat = destination?.latitude || 12.8452;
  const destLng = destination?.longitude || 77.6602;

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (map) return;

    const initialCenter = [(originLat + destLat) / 2, (originLng + destLng) / 2];

    const mapInstance = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 7,
      zoomControl: true,
    });

    const tile = TILE_LAYERS[activeTile] || TILE_LAYERS.osm;
    tileLayerRef.current = L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: tile.maxZoom || 19,
    }).addTo(mapInstance);

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
      setMap(null);
    };
  }, []);

  // 2. Handle Tile Switching
  useEffect(() => {
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const tile = TILE_LAYERS[activeTile] || TILE_LAYERS.osm;
    tileLayerRef.current = L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: tile.maxZoom || 19,
    }).addTo(map);
  }, [map, activeTile]);

  // 3. Fit Bounds Helper
  const fitRouteBounds = useCallback(() => {
    if (!map) return;

    const points = [
      [originLat, originLng],
      [destLat, destLng],
    ];

    if (currentLocation?.latitude && currentLocation?.longitude) {
      points.push([currentLocation.latitude, currentLocation.longitude]);
    }

    // Include route coordinates if available
    let plannedCoords = [];
    if (route?.encodedPolyline) {
      plannedCoords = decodePolyline(route.encodedPolyline);
      for (let i = 0; i < plannedCoords.length; i += 40) {
        points.push(plannedCoords[i]);
      }
    }

    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 14 });
    }
  }, [map, originLat, originLng, destLat, destLng, currentLocation, route]);

  // 4. Update Markers and Polylines whenever map or data changes
  useEffect(() => {
    if (!map) return;

    // --- Origin Marker (A Pin - Blue) ---
    if (originLat && originLng) {
      const originIcon = L.divIcon({
        className: "custom-origin-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
            <div style="background-color: #2563EB; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px;">
              A
            </div>
            <div style="margin-top: 3px; background: rgba(15, 23, 42, 0.92); color: white; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${origin?.name || "Origin (Raichur)"}
            </div>
          </div>
        `,
        iconSize: [32, 58],
        iconAnchor: [16, 16],
      });

      if (!markersRef.current.origin) {
        markersRef.current.origin = L.marker([originLat, originLng], { icon: originIcon, zIndexOffset: 500 })
          .addTo(map)
          .bindPopup(`<b>Origin Facility:</b> ${origin?.name || "Origin"}<br/>${origin?.address || ""}`);
      } else {
        markersRef.current.origin.setLatLng([originLat, originLng]);
      }
    }

    // --- Destination Marker (B Pin - Emerald) ---
    if (destLat && destLng) {
      const destIcon = L.divIcon({
        className: "custom-dest-pin",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; z-index: 500;">
            <div style="background-color: #10B981; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px;">
              B
            </div>
            <div style="margin-top: 3px; background: rgba(15, 23, 42, 0.92); color: white; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${destination?.name || "Destination (Bangalore)"}
            </div>
          </div>
        `,
        iconSize: [32, 58],
        iconAnchor: [16, 16],
      });

      if (!markersRef.current.destination) {
        markersRef.current.destination = L.marker([destLat, destLng], { icon: destIcon, zIndexOffset: 500 })
          .addTo(map)
          .bindPopup(`<b>Destination Facility:</b> ${destination?.name || "Destination"}<br/>${destination?.address || ""}`);
      } else {
        markersRef.current.destination.setLatLng([destLat, destLng]);
      }
    }

    // --- Live Vehicle Marker (Truck with radar pulse & heading) ---
    if (currentLocation?.latitude != null && currentLocation?.longitude != null) {
      const vLat = currentLocation.latitude;
      const vLng = currentLocation.longitude;
      const heading = currentLocation.headingDegrees || 0;
      const speed = currentLocation.speedKph != null ? Math.round(currentLocation.speedKph) : 0;

      const vehicleIcon = L.divIcon({
        className: "custom-vehicle-marker",
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: #0284C7; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 36px; height: 36px; border-radius: 50%; background: #0F172A; border: 2.5px solid #38BDF8; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5">
                <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
              </svg>
            </div>
            <div style="position: absolute; top: -20px; background: #0284C7; color: white; font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; white-space: nowrap; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
              ${speed > 0 ? `${speed} km/h` : "Live Vehicle"}
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      if (!markersRef.current.vehicle) {
        markersRef.current.vehicle = L.marker([vLat, vLng], { icon: vehicleIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(`<b>Shipment:</b> ${shipmentNumber || "In Transit"}<br/><b>Speed:</b> ${speed} km/h<br/><b>Heading:</b> ${heading}°`);
      } else {
        markersRef.current.vehicle.setIcon(vehicleIcon);
        markersRef.current.vehicle.setLatLng([vLat, vLng]);
      }

      if (autoFollow) {
        map.panTo([vLat, vLng], { animate: true, duration: 0.5 });
      }
    }

    // --- Planned Highway Route Polyline ---
    let plannedCoords = [];
    if (route?.encodedPolyline) {
      plannedCoords = decodePolyline(route.encodedPolyline);
    } else if (originLat && originLng && destLat && destLng) {
      plannedCoords = [[originLat, originLng], [destLat, destLng]];
    }

    if (plannedCoords.length > 0) {
      if (!linesRef.current.planned) {
        linesRef.current.planned = L.polyline(plannedCoords, {
          color: "#2563EB",
          weight: 5,
          opacity: 0.85,
        }).addTo(map);
      } else {
        linesRef.current.planned.setLatLngs(plannedCoords);
      }
    }

    // --- Traveled Breadcrumb Trail Polyline ---
    if (trail && trail.length > 0) {
      const trailCoords = trail.map((t) => [t.latitude, t.longitude]);
      if (!linesRef.current.trail) {
        linesRef.current.trail = L.polyline(trailCoords, {
          color: "#10B981",
          weight: 6,
          opacity: 0.95,
        }).addTo(map);
      } else {
        linesRef.current.trail.setLatLngs(trailCoords);
      }
    }

    // Auto-fit bounds on initial data load
    const timer = setTimeout(() => {
      fitRouteBounds();
    }, 150);
    return () => clearTimeout(timer);

  }, [map, originLat, originLng, destLat, destLng, currentLocation, route, trail, autoFollow, shipmentNumber, fitRouteBounds]);

  return (
    <div className="relative w-full h-[540px] rounded-lg border border-border overflow-hidden shadow-sm">
      {/* Real Interactive Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Controls Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <div className="bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded border border-border shadow-md text-xs flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${currentLocation ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span className="font-semibold text-ink">Live OpenStreetMap GPS Tracking</span>
          <span className="text-ink-muted">|</span>
          <span className="font-mono text-ink-muted">
            {currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : "Awaiting GPS Signal"}
          </span>
        </div>

        {/* Fit Route / Recenter Button */}
        <Button
          size="sm"
          variant="secondary"
          onClick={fitRouteBounds}
          title="Fit route and view entire path from Raichur to Bangalore"
          className="shadow-md bg-surface/95 backdrop-blur-md text-xs h-8"
        >
          <Crosshair className="w-3.5 h-3.5 mr-1 text-primary" /> Fit Route
        </Button>
      </div>

      {/* Top Right Map Style Selector */}
      <div className="absolute top-3 right-3 z-[1000] bg-surface/95 backdrop-blur-md px-2 py-1.5 rounded border border-border shadow-md flex items-center gap-1 text-xs">
        <Layers className="w-3.5 h-3.5 text-ink-muted mr-1" />
        {Object.entries(TILE_LAYERS).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setActiveTile(key)}
            className={`px-2 py-0.5 rounded transition ${
              activeTile === key
                ? "bg-primary text-white font-semibold shadow-xs"
                : "text-ink-muted hover:text-ink hover:bg-surface-muted"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-surface/95 backdrop-blur-md px-3 py-2 rounded border border-border shadow-md text-xs flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">A</span>
          <span className="font-medium text-ink">Origin ({origin?.name || "Pickup"})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white font-bold">B</span>
          <span className="font-medium text-ink">Destination ({destination?.name || "Delivery"})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-sky-500 border border-slate-900" />
          <span className="font-medium text-ink">Live Vehicle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-1 bg-emerald-500 rounded" />
          <span className="font-medium text-ink">Traveled Trail</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-1 bg-blue-600 rounded" />
          <span className="font-medium text-ink">Planned Route</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Navigation,
  MapPin,
  Truck,
  Compass,
  Gauge,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Smartphone
} from "lucide-react";
import { Card, Badge, Button, Alert, LoadingBlock } from "../../components/ui";
import { transferApi } from "../../services/transferApi";

export default function DriverTracker() {
  const { shipmentNumber } = useParams();

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackingState, setTrackingState] = useState("WAITING_FOR_GPS");
  const [statusMessage, setStatusMessage] = useState("");

  const [telemetry, setTelemetry] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    speedKph: 0,
    heading: null,
    altitude: null,
    lastUpdate: null,
    pingCount: 0,
  });

  const watchIdRef = useRef(null);
  const isTrackingRef = useRef(false);
  const lastSendTimeRef = useRef(0);
  const isSendingRef = useRef(false);

  const fetchShipment = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await transferApi.getDriverShipment(shipmentNumber);
      setShipment(res);

      if (res.status === "RECEIVED") {
        setTrackingState("SHIPMENT_RECEIVED");
        setStatusMessage("This shipment has been received at the destination. Tracking is complete.");
      } else if (res.status !== "IN_TRANSIT") {
        setTrackingState("WAITING_FOR_GPS");
        setStatusMessage(`Shipment is currently ${res.status}. GPS tracking activates when dispatched IN TRANSIT.`);
      } else {
        setStatusMessage("Ready to track. Tap 'Start GPS Tracking' to begin transmitting phone coordinates.");
      }
    } catch (err) {
      setError(err.message || `Shipment ${shipmentNumber} not found.`);
    } finally {
      setLoading(false);
    }
  }, [shipmentNumber]);

  useEffect(() => {
    fetchShipment();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      isTrackingRef.current = false;
    };
  }, [fetchShipment]);

  const sendLocationPing = async (pos) => {
    const coords = pos.coords;
    const now = Date.now();

    // 1. Enforce throttle: Minimum 1.8 seconds between telemetry pings
    if (now - lastSendTimeRef.current < 1800) {
      return;
    }

    // 2. Prevent overlapping in-flight network submissions
    if (isSendingRef.current) {
      return;
    }

    lastSendTimeRef.current = now;
    isSendingRef.current = true;

    const speedKmh = coords.speed != null && coords.speed >= 0
      ? Math.round(coords.speed * 3.6 * 10) / 10
      : 0.0;

    const headingDeg = coords.heading != null && !isNaN(coords.heading)
      ? Math.round(coords.heading * 10) / 10
      : null;

    setTelemetry((prev) => ({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Math.round(coords.accuracy),
      speedKph: speedKmh,
      heading: headingDeg,
      altitude: coords.altitude != null ? Math.round(coords.altitude) : null,
      lastUpdate: new Date(),
      pingCount: prev.pingCount + 1,
    }));

    setTrackingState("GPS_ACTIVE");
    setStatusMessage("Live GPS telemetry streaming to MedChain backend.");

    try {
      const deviceId = shipment?.trackingDeviceId || `DEV-PHONE-${shipmentNumber}`;
      await transferApi.ingestLocation({
        shipmentId: shipment?.shipmentNumber || shipmentNumber,
        trackingDeviceId: deviceId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        speedKph: speedKmh,
        headingDegrees: headingDeg,
        accuracyMeters: coords.accuracy,
        altitudeMeters: coords.altitude,
        source: "SMARTPHONE_GPS",
        recordedAt: new Date(pos.timestamp).toISOString(),
      });
    } catch (err) {
      console.warn("Telemetry transmission error:", err.message);
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleStartTracking = () => {
    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      setTrackingState("GPS_ERROR");
      setError("Secure Context Required: Mobile browsers strictly require HTTPS to access satellite GPS hardware. Please access the tracker via HTTPS (e.g., your Vercel deployment or an HTTPS local tunnel).");
      return;
    }

    if (!navigator.geolocation) {
      setTrackingState("GPS_ERROR");
      setError("Geolocation is not supported by your browser or smartphone.");
      return;
    }

    if (shipment?.status !== "IN_TRANSIT") {
      setError(`Cannot track: Shipment status is ${shipment?.status}. Must be IN_TRANSIT.`);
      return;
    }

    // Clean up any existing watcher to prevent duplicates
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setError("");
    setTrackingState("WAITING_FOR_GPS");
    setStatusMessage("Acquiring high-accuracy GPS lock from phone satellite/sensors...");
    isTrackingRef.current = true;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocationPing(pos);
      },
      (err) => {
        setTrackingState("GPS_ERROR");
        let msg = "Failed to acquire GPS location.";
        if (err.code === 1) msg = "Location permission denied. Please allow GPS/Location access in browser settings.";
        else if (err.code === 2) msg = "GPS position unavailable. Please ensure phone Location/GPS is turned ON.";
        else if (err.code === 3) msg = "GPS signal acquisition timed out.";
        setError(msg);
        setStatusMessage(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 1000,
      }
    );
  };

  const handleStopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    isTrackingRef.current = false;
    setTrackingState("TRACKING_STOPPED");
    setStatusMessage("GPS tracking paused by driver. You can resume at any time.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center p-4">
        <LoadingBlock label="Connecting to vehicle dispatch..." />
      </div>
    );
  }

  const isLive = trackingState === "GPS_ACTIVE";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 max-w-md mx-auto selection:bg-primary selection:text-white font-sans">
      <header className="space-y-2 pt-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-wide">MedChain Driver PWA</h1>
              <p className="text-xs text-slate-400 font-mono">Smartphone GPS Tracker</p>
            </div>
          </div>
          <Badge
            tone={
              trackingState === "GPS_ACTIVE"
                ? "success"
                : trackingState === "GPS_ERROR"
                ? "danger"
                : trackingState === "SHIPMENT_RECEIVED"
                ? "neutral"
                : "warning"
            }
          >
            {trackingState.replace(/_/g, " ")}
          </Badge>
        </div>

        {error && <Alert tone="danger" className="text-xs">{error}</Alert>}

        {shipment && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cargo Shipment</span>
                <p className="font-mono text-base font-bold text-white">{shipment.shipmentNumber}</p>
              </div>
              <Badge tone={shipment.status === "IN_TRANSIT" ? "primary" : "neutral"}>
                {shipment.status}
              </Badge>
            </div>

            <div className="bg-slate-950/60 rounded-lg p-2.5 border border-slate-800/80">
              <div className="text-xs text-slate-400">Medicine</div>
              <div className="text-sm font-semibold text-emerald-400">{shipment.medicineName}</div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">Batch: {shipment.batchId}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Origin</span>
                <span className="text-slate-200 font-medium truncate block">{shipment.fromOrg}</span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded border border-slate-800/50">
                <span className="text-[10px] text-slate-400 uppercase block font-semibold">Destination</span>
                <span className="text-slate-200 font-medium truncate block">{shipment.toOrg}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="my-4 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-primary" /> Live Satellite Telemetry
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Pings: <strong className="text-white">{telemetry.pingCount}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" /> Speed
              </div>
              <div className="text-3xl font-mono font-bold text-white">
                {telemetry.speedKph.toFixed(0)}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">km / h</span>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1 text-slate-400 text-xs mb-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" /> Heading
              </div>
              <div className="text-3xl font-mono font-bold text-white">
                {telemetry.heading != null ? `${telemetry.heading}°` : "—"}
              </div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Bearing</span>
            </div>
          </div>

          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Latitude</span>
              <span className="font-mono text-slate-200 font-medium">
                {telemetry.latitude != null ? telemetry.latitude.toFixed(6) : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">Longitude</span>
              <span className="font-mono text-slate-200 font-medium">
                {telemetry.longitude != null ? telemetry.longitude.toFixed(6) : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">GPS Accuracy</span>
              <span className="font-mono text-emerald-400 font-medium">
                {telemetry.accuracy != null ? `±${telemetry.accuracy} meters` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
              <span className="text-slate-400">Last Telemetry Ping</span>
              <span className="font-mono text-slate-300 text-[11px]">
                {telemetry.lastUpdate ? telemetry.lastUpdate.toLocaleTimeString() : "No signal yet"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span>{statusMessage}</span>
          </div>
        </div>
      </main>

      <footer className="space-y-3 pb-4">
        {shipment?.status === "IN_TRANSIT" && (
          <div>
            {!isLive ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full text-base font-semibold py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                onClick={handleStartTracking}
              >
                <Play className="w-5 h-5 fill-current" /> Start GPS Tracking
              </Button>
            ) : (
              <Button
                variant="danger"
                size="lg"
                className="w-full text-base font-semibold py-4 flex items-center justify-center gap-2"
                onClick={handleStopTracking}
              >
                <Square className="w-5 h-5 fill-current" /> Stop GPS Tracking
              </Button>
            )}
          </div>
        )}

        {shipment?.status === "INITIATED" && (
          <div className="text-center p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg text-xs text-amber-300">
            Shipment has not been dispatched yet. The origin facility must mark it <strong>IN TRANSIT</strong> before GPS tracking begins.
          </div>
        )}

        {shipment?.status === "RECEIVED" && (
          <div className="text-center p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-xs text-emerald-300">
            Shipment has reached its destination and is marked <strong>RECEIVED</strong>.
          </div>
        )}

        <div className="text-center">
          <Link
            to={`/app/transfers/${shipment?.transferId || ""}/tracking`}
            className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Live Map on Web Dashboard <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}

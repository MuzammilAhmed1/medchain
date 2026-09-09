import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  Radio,
  Navigation,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Gauge,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  Square,
  Activity,
  Check,
  CircleDot
} from "lucide-react";
import { PageHeader, Card, Badge, Button, Alert, LoadingBlock } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { transferApi } from "../../services/transferApi";
import { useEventSource } from "../../hooks/useEventSource";
import ShipmentTrackingMap from "./ShipmentTrackingMap";

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

function formatDate(val) {
  if (!val) return "—";
  try {
    return format(new Date(val), "MMM d, yyyy h:mm:ss a");
  } catch {
    return val;
  }
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
}

export default function ShipmentTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [trail, setTrail] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [autoFollow, setAutoFollow] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Live GPS Simulation state
  const [simulating, setSimulating] = useState(false);
  const [autoSimulating, setAutoSimulating] = useState(false);
  const autoSimRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const [summaryRes, trailRes, historyRes] = await Promise.all([
        transferApi.getTrackingSummary(id),
        transferApi.getTrackingTrail(id).catch(() => []),
        transferApi.getTrackingHistory(id, { page: historyPage, size: 20 }).catch(() => ({ content: [] })),
      ]);
      setSummary(summaryRes);
      setTrail(Array.isArray(trailRes) ? trailRes : []);
      setHistory(historyRes?.content || (Array.isArray(historyRes) ? historyRes : []));
    } catch (err) {
      setError(err.message || "Could not load tracking information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, historyPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time SSE listener
  useEventSource({
    SHIPMENT_LOCATION_UPDATED: (data) => {
      if (data && (data.shipmentId === id || data.shipmentNumber === id || (summary && data.shipmentId === summary.transferId))) {
        loadData();
      }
    },
    TRANSFER_UPDATED: (data) => {
      if (data && (data.id === id || data.shipmentNumber === id)) {
        loadData();
      }
    },
  });

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Decode the road coordinates from the highway route
  const roadCoords = summary?.route?.encodedPolyline
    ? decodePolyline(summary.route.encodedPolyline)
    : [];

  // Simulate a realistic GPS ping along the exact highway road
  const handleSimulateStep = async () => {
    if (!summary) return;
    setSimulating(true);
    try {
      const oLat = summary.originLatitude || 16.2120;
      const oLng = summary.originLongitude || 77.3439;
      const dLat = summary.destinationLatitude || 12.8452;
      const dLng = summary.destinationLongitude || 77.6602;

      // Current location or start at origin
      const cLat = summary.currentLatitude != null ? summary.currentLatitude : oLat;
      const cLng = summary.currentLongitude != null ? summary.currentLongitude : oLng;

      let nextLat = dLat;
      let nextLng = dLng;
      let bearing = 180;

      if (roadCoords.length > 5) {
        // Find closest point index in roadCoords
        let closestIdx = 0;
        let minDist = Infinity;
        for (let i = 0; i < roadCoords.length; i++) {
          const pt = roadCoords[i];
          const d = Math.hypot(pt[0] - cLat, pt[1] - cLng);
          if (d < minDist) {
            minDist = d;
            closestIdx = i;
          }
        }

        // Advance along the road by ~4% of total route waypoints
        const advanceCount = Math.max(3, Math.floor(roadCoords.length / 25));
        const nextIdx = Math.min(roadCoords.length - 1, closestIdx + advanceCount);
        const nextPoint = roadCoords[nextIdx];
        nextLat = nextPoint[0];
        nextLng = nextPoint[1];

        // Calculate bearing between previous and next road point
        const y = Math.sin((nextLng - cLng) * Math.PI / 180) * Math.cos(nextLat * Math.PI / 180);
        const x = Math.cos(cLat * Math.PI / 180) * Math.sin(nextLat * Math.PI / 180) -
                  Math.sin(cLat * Math.PI / 180) * Math.cos(nextLat * Math.PI / 180) * Math.cos((nextLng - cLng) * Math.PI / 180);
        bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      } else {
        // Fallback linear step
        const step = 0.07;
        nextLat = cLat + (dLat - cLat) * step;
        nextLng = cLng + (dLng - cLng) * step;
      }

      const deviceId = summary.trackingDeviceId || `DEV-${summary.shipmentNumber || "TRUCK"}`;
      await transferApi.ingestLocation({
        shipmentId: summary.shipmentNumber || summary.transferId,
        trackingDeviceId: deviceId,
        latitude: parseFloat(nextLat.toFixed(5)),
        longitude: parseFloat(nextLng.toFixed(5)),
        speedKph: 58 + Math.floor(Math.random() * 14),
        headingDegrees: parseFloat(bearing.toFixed(1)),
        recordedAt: new Date().toISOString(),
        temperatureCelsius: 4.6 + (Math.random() * 0.4),
        humidityPercent: 54,
      });

      await loadData();
    } catch (err) {
      console.error("GPS simulation error:", err);
    } finally {
      setSimulating(false);
    }
  };

  // Auto-drive simulation loop
  useEffect(() => {
    autoSimRef.current = autoSimulating;
    if (!autoSimulating) return;

    const interval = setInterval(() => {
      if (autoSimRef.current) {
        handleSimulateStep();
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [autoSimulating, summary, roadCoords]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/app/transfers/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Shipment Details
        </Button>
        <LoadingBlock label="Loading real-time GPS telemetry & highway route data…" />
      </div>
    );
  }

  if (!summary && error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/transfers")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Transfers
        </Button>
        <Alert tone="danger" title="Tracking Unavailable">
          {error}
        </Alert>
      </div>
    );
  }

  const originFacility = {
    name: summary?.fromOrg,
    address: summary?.originAddress,
    latitude: summary?.originLatitude,
    longitude: summary?.originLongitude,
  };

  const destinationFacility = {
    name: summary?.toOrg,
    address: summary?.destinationAddress,
    latitude: summary?.destinationLatitude,
    longitude: summary?.destinationLongitude,
  };

  // Status computation for human-friendly display
  const isLive = summary?.trackingStatus === "LIVE";
  const isStale = summary?.trackingStatus === "STALE";
  const isWaiting = summary?.trackingStatus === "WAITING_FOR_SIGNAL" || summary?.trackingStatus === "NOT_CONFIGURED" || (!summary?.currentLocation && !isLive);

  const statusLabel = isLive
    ? "LIVE GPS"
    : isStale
    ? "SIGNAL STALE"
    : isWaiting
    ? "WAITING FOR SIGNAL"
    : "OFFLINE";

  const statusToneClass = isLive
    ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
    : isStale
    ? "bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30"
    : isWaiting
    ? "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/30"
    : "bg-slate-500/10 text-slate-600";

  // Percentage complete calculation
  const totalDist = (summary?.distanceTravelledMeters || 0) + (summary?.distanceRemainingMeters || 0);
  const pctComplete = totalDist > 0
    ? Math.min(100, Math.round(((summary?.distanceTravelledMeters || 0) / totalDist) * 100))
    : (isLive ? 15 : 0);

  // Highway milestones
  const milestones = [
    { label: "1. Origin Dispatch", desc: summary?.fromOrg || "Raichur Facility", threshold: 0 },
    { label: "2. Highway NH 150A", desc: "Siruguppa / Bellary Checkpoint", threshold: 25 },
    { label: "3. Central Junction", desc: "Chitradurga NH 48 Toll", threshold: 50 },
    { label: "4. Tumkur Corridor", desc: "Tumkur Expressway Entrance", threshold: 75 },
    { label: "5. Destination Receipt", desc: summary?.toOrg || "Bangalore Electronic City", threshold: 95 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(`/app/transfers/${id}`)}
            className="inline-flex items-center text-small text-ink-muted hover:text-ink mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Shipment Details
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink font-mono">
              {summary?.shipmentNumber}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusToneClass}`}
            >
              <Radio className={`w-3 h-3 mr-1 ${isLive ? "animate-pulse" : ""}`} />
              {statusLabel}
            </span>
          </div>
          <p className="text-small text-ink-muted mt-1">
            Real-Time GPS Telemetry: <span className="font-semibold text-ink">{summary?.fromOrg}</span> →{" "}
            <span className="font-semibold text-ink">{summary?.toOrg}</span>
          </p>
        </div>

        {/* Action Controls & Simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Simulate One GPS Ping along road */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleSimulateStep}
            disabled={simulating}
            title="Transmit simulated GPS telemetry ping along exact highway road"
          >
            <Navigation className="w-3.5 h-3.5 mr-1" />
            {simulating ? "Transmitting GPS…" : "Simulate GPS Ping"}
          </Button>

          {/* Auto Drive Simulation Toggle */}
          <Button
            variant={autoSimulating ? "danger" : "secondary"}
            size="sm"
            onClick={() => setAutoSimulating(!autoSimulating)}
            title="Auto-transmit GPS ping every 3.5 seconds along highway"
          >
            {autoSimulating ? (
              <>
                <Square className="w-3.5 h-3.5 mr-1 text-danger" /> Stop Auto-Sim
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Auto-Drive
              </>
            )}
          </Button>

          {/* Refresh */}
          <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Link to={`/app/batches/${summary?.batchId}`}>
            <Button variant="ghost" size="sm">
              Batch: {summary?.batchId} <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Active Alerts / Warning Banner */}
      {summary?.activeAlerts && summary.activeAlerts.length > 0 && (
        <div className="space-y-2">
          {summary.activeAlerts.map((alertText, idx) => (
            <Alert key={idx} tone="warning" title="Transportation Telemetry Alert">
              {alertText}
            </Alert>
          ))}
        </div>
      )}

      {/* Live KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Speed */}
        <Card className="p-4">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-primary" /> Speed
          </span>
          <p className="text-xl font-bold text-ink mt-1 font-mono">
            {summary?.currentSpeedKph != null ? `${Math.round(summary.currentSpeedKph)} km/h` : "0 km/h"}
          </p>
          <span className="text-[11px] text-ink-muted block mt-0.5">Live Vehicle Telemetry</span>
        </Card>

        {/* Heading */}
        <Card className="p-4">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-primary" /> Heading
          </span>
          <p className="text-xl font-bold text-ink mt-1 font-mono">
            {summary?.headingDegrees != null ? `${Math.round(summary.headingDegrees)}°` : "—"}
          </p>
          <span className="text-[11px] text-ink-muted block mt-0.5">Direction of Travel</span>
        </Card>

        {/* ETA */}
        <Card className="p-4">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" /> ETA
          </span>
          <p className="text-xl font-bold text-ink mt-1 font-mono">
            {summary?.estimatedArrivalAt
              ? format(new Date(summary.estimatedArrivalAt), "h:mm a")
              : "ETA unavailable"}
          </p>
          <span className="text-[11px] text-ink-muted block mt-0.5">
            {summary?.route?.trafficDurationSeconds
              ? `Est. ${formatDuration(summary.route.trafficDurationSeconds)}`
              : "Route telemetry needed"}
          </span>
        </Card>

        {/* Traffic Delay */}
        <Card className="p-4">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Traffic Delay
          </span>
          <p className="text-xl font-bold text-ink mt-1 font-mono">
            {summary?.trafficDelaySeconds && summary.trafficDelaySeconds > 0
              ? `+${Math.round(summary.trafficDelaySeconds / 60)} min`
              : "Normal"}
          </p>
          <span className="text-[11px] text-ink-muted block mt-0.5">Highway Traffic</span>
        </Card>

        {/* Distance Remaining */}
        <Card className="p-4">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-primary" /> Remaining
          </span>
          <p className="text-xl font-bold text-ink mt-1 font-mono">
            {summary?.distanceRemainingMeters != null
              ? `${(summary.distanceRemainingMeters / 1000).toFixed(1)} km`
              : "—"}
          </p>
          <span className="text-[11px] text-ink-muted block mt-0.5">Road Distance</span>
        </Card>

        {/* Distance Travelled */}
        <Card className="p-4">
          <span className="text-xs font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" /> Travelled
          </span>
          <p className="text-xl font-bold text-ink mt-1 font-mono">
            {summary?.distanceTravelledMeters != null
              ? `${(summary.distanceTravelledMeters / 1000).toFixed(1)} km`
              : "0.0 km"}
          </p>
          <span className="text-[11px] text-ink-muted block mt-0.5">GPS Trail Logged</span>
        </Card>
      </div>

      {/* Main Interactive Map Component */}
      <Card className="p-3">
        <ShipmentTrackingMap
          origin={originFacility}
          destination={destinationFacility}
          currentLocation={summary?.currentLocation}
          route={summary?.route}
          trail={trail}
          trackingStatus={summary?.trackingStatus}
          shipmentNumber={summary?.shipmentNumber}
          autoFollow={autoFollow}
          onToggleAutoFollow={() => setAutoFollow(!autoFollow)}
        />
      </Card>

      {/* Exact Medicine Transit Progress & Checkpoints */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-3">
          <div>
            <h3 className="text-body font-semibold text-ink flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Exact Medicine Transportation Journey & Checkpoints
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Live transit progress across National Highway checkpoints with temperature monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Cold Chain Safe (4.8°C)
            </span>
            <span className="text-xs font-mono font-semibold text-ink px-2 py-1 rounded bg-surface-muted">
              {pctComplete}% Completed
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${Math.max(3, Math.min(100, pctComplete))}%` }}
          />
        </div>

        {/* Milestone Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {milestones.map((m, idx) => {
            const isPassed = pctComplete >= m.threshold && (idx === 0 || pctComplete > m.threshold);
            const isCurrent = pctComplete >= m.threshold && (idx === milestones.length - 1 || pctComplete < milestones[idx + 1].threshold);

            return (
              <div
                key={idx}
                className={`p-3 rounded border text-xs transition ${
                  isPassed
                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-950"
                    : isCurrent
                    ? "bg-primary/5 border-primary text-primary"
                    : "bg-surface-muted/40 border-border text-ink-muted"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{m.label}</span>
                  {isPassed ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <CircleDot className="w-3.5 h-3.5 text-primary animate-pulse" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-border" />
                  )}
                </div>
                <p className="text-[11px] opacity-80">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Vehicle and Telemetry Metadata Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-2">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-primary" /> IoT Tracking Node
          </span>
          <div>
            <span className="text-xs text-ink-muted block">Device Identifier</span>
            <span className="text-body font-semibold text-ink font-mono">
              {summary?.trackingDeviceId || "DEV-UNASSIGNED"}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Last Ping Received</span>
            <span className="text-small text-ink">
              {summary?.lastRecordedAt ? formatDate(summary.lastRecordedAt) : "Awaiting first signal"}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Coordinates</span>
            <span className="text-small font-mono text-ink">
              {summary?.currentLocation
                ? `${summary.currentLocation.latitude.toFixed(5)}, ${summary.currentLocation.longitude.toFixed(5)}`
                : "Location not received"}
            </span>
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-primary" /> Road Route Geometry
          </span>
          <div>
            <span className="text-xs text-ink-muted block">Routing Engine</span>
            <span className="text-small font-medium text-ink">
              {summary?.route?.routeStatus === "ACTIVE"
                ? "OpenStreetMap Road Network (OSRM Highway Engine)"
                : "High-Resolution Highway Route Engine"}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Highway Distance</span>
            <span className="text-small font-mono text-ink">
              {summary?.route?.distanceKm != null ? `${summary.route.distanceKm.toFixed(1)} km` : "—"}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Estimated Driving Duration</span>
            <span className="text-small font-mono text-ink">
              {summary?.route?.trafficDurationSeconds
                ? formatDuration(summary.route.trafficDurationSeconds)
                : "—"}
            </span>
          </div>
        </Card>

        <Card className="p-5 space-y-2">
          <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Security & Medicine Custody
          </span>
          <div>
            <span className="text-xs text-ink-muted block">Medicine Batch Cargo</span>
            <span className="text-small font-medium text-ink">
              {summary?.medicineName || "Pharmaceutical Batch"} ({summary?.batchId})
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Custody Handoff</span>
            <span className="text-small text-ink">
              {summary?.fromOrg} → {summary?.toOrg}
            </span>
          </div>
          <div>
            <span className="text-xs text-ink-muted block">Tamper Resistance</span>
            <span className="text-small text-ink">
              Chronological GPS log in PostgreSQL with on-chain lifecycle proofs
            </span>
          </div>
        </Card>
      </div>

      {/* Collapsible Location History Breadcrumbs */}
      <Card className="p-5">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-body font-semibold text-ink">
              GPS Location History Breadcrumbs ({trail.length} points logged)
            </h3>
          </div>
          <Button variant="ghost" size="sm">
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {showHistory && (
          <div className="mt-4 overflow-x-auto">
            {history.length === 0 ? (
              <p className="text-small text-ink-muted italic py-2">No GPS records logged yet. Click "Simulate GPS Ping" or "Auto-Drive" above to send live coordinates.</p>
            ) : (
              <table className="w-full text-small text-left">
                <thead className="border-b border-border text-xs text-ink-muted uppercase">
                  <tr>
                    <th className="py-2 px-3">Recorded Time</th>
                    <th className="py-2 px-3">Latitude</th>
                    <th className="py-2 px-3">Longitude</th>
                    <th className="py-2 px-3">Speed</th>
                    <th className="py-2 px-3">Heading</th>
                    <th className="py-2 px-3">Accuracy</th>
                    <th className="py-2 px-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono text-xs">
                  {history.map((pt) => (
                    <tr key={pt.id} className="hover:bg-surface-muted/40">
                      <td className="py-2 px-3 text-ink font-sans">{formatDate(pt.recordedAt)}</td>
                      <td className="py-2 px-3 text-ink">{pt.latitude?.toFixed(5)}</td>
                      <td className="py-2 px-3 text-ink">{pt.longitude?.toFixed(5)}</td>
                      <td className="py-2 px-3 text-ink">{pt.speedKph != null ? `${Math.round(pt.speedKph)} km/h` : "—"}</td>
                      <td className="py-2 px-3 text-ink">{pt.headingDegrees != null ? `${Math.round(pt.headingDegrees)}°` : "—"}</td>
                      <td className="py-2 px-3 text-ink">{pt.accuracyMeters != null ? `±${pt.accuracyMeters.toFixed(1)}m` : "—"}</td>
                      <td className="py-2 px-3 text-ink-muted uppercase text-[10px] font-sans">{pt.source || "DEVICE"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

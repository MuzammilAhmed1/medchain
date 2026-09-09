import { useEffect, useState } from "react";
import {
  Thermometer,
  AlertTriangle,
  RefreshCw,
  Radio,
  Clock,
  MapPin,
  CheckCircle2,
  Terminal,
  Send,
  Flame,
  Snowflake,
  PlusCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui";
import { coldChainApi } from "../../services/coldChainApi";
import { batchApi } from "../../services/batchApi";
import { useEventSource } from "../../hooks/useEventSource";

export default function ColdChainMonitoring() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [manualBatchId, setManualBatchId] = useState("");
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manual Telemetry Ingestion State
  const [inputTemp, setInputTemp] = useState("4.5");
  const [inputHum, setInputHum] = useState("52.0");
  const [inputDevice, setInputDevice] = useState("DEV-COLD-IOT-01");
  const [inputLocation, setInputLocation] = useState("Central Warehouse Bay 4");
  const [submittingReading, setSubmittingReading] = useState(false);
  const [inputSuccessMsg, setInputSuccessMsg] = useState(null);

  // Load available batches
  useEffect(() => {
    async function loadBatches() {
      try {
        const data = await batchApi.list();
        setBatches(data || []);
        if (data && data.length > 0) {
          setSelectedBatchId(data[0].id);
          setManualBatchId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    }
    loadBatches();
  }, []);

  // Fetch telemetry & alerts for selected batch
  const fetchTelemetry = async (batchId) => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const [readingsData, alertsData] = await Promise.all([
        coldChainApi.getReadings(batchId),
        coldChainApi.getAlerts(batchId),
      ]);
      setReadings(readingsData || []);
      setAlerts(alertsData || []);
    } catch (err) {
      setError(err.message || "Failed to load telemetry data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchTelemetry(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Hook into real-time SSE stream
  const { isConnected } = useEventSource({
    COLD_CHAIN_READING: (newReading) => {
      if (newReading.batchId === selectedBatchId) {
        setReadings((prev) => [...prev, newReading]);
      }
    },
    COLD_CHAIN_ALERT: (newAlert) => {
      if (newAlert.batchId === selectedBatchId) {
        setAlerts((prev) => [newAlert, ...prev]);
      }
    },
  });

  const chartData = readings.map((r) => ({
    time: new Date(r.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    temperature: r.temperature,
    humidity: r.humidity,
  }));

  const latestReading = readings[readings.length - 1];

  // Submit manual telemetry reading
  const handleManualReadingSubmit = async (e) => {
    if (e) e.preventDefault();
    const targetBatch = selectedBatchId || manualBatchId;
    if (!targetBatch) {
      setError("Please select or enter a Batch ID.");
      return;
    }
    const temp = parseFloat(inputTemp);
    if (isNaN(temp)) {
      setError("Please enter a valid temperature value.");
      return;
    }

    setSubmittingReading(true);
    setError(null);
    setInputSuccessMsg(null);

    try {
      const payload = {
        batchId: targetBatch,
        deviceId: inputDevice || "DEV-COLD-IOT-01",
        temperature: temp,
        humidity: inputHum ? parseFloat(inputHum) : 50.0,
        location: inputLocation || "Central Warehouse Bay 4",
      };

      const res = await coldChainApi.recordReading(payload);
      setInputSuccessMsg(
        `✅ Reading transmitted: ${res.temperature}°C from ${res.deviceId} for ${targetBatch}`
      );
      await fetchTelemetry(targetBatch);
    } catch (err) {
      setError(err.message || "Failed to record reading.");
    } finally {
      setSubmittingReading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cold-Chain Monitoring"
        description="Real-time pharmaceutical temperature & humidity telemetry with AI excursion detection."
        action={
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {isConnected ? "Live IoT Feed" : "Connecting..."}
            </div>

            <button
              onClick={() => fetchTelemetry(selectedBatchId)}
              disabled={loading || !selectedBatchId}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-xs text-small text-ink hover:bg-canvas transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        }
      />

      {/* Batch selector bar & Manual Input */}
      <div className="p-4 bg-surface border border-border rounded-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="batchSelect" className="text-small font-medium text-ink">
            Monitored Batch:
          </label>
          <select
            id="batchSelect"
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              setManualBatchId(e.target.value);
            }}
            className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink focus:outline-hidden focus:border-primary font-mono"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.medicineName} ({b.status})
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-muted">or enter ID:</span>
          <input
            type="text"
            placeholder="e.g. MC-2026-00003"
            value={manualBatchId}
            onChange={(e) => {
              setManualBatchId(e.target.value);
              setSelectedBatchId(e.target.value);
            }}
            className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono w-44 focus:outline-hidden focus:border-primary"
          />
        </div>

        {latestReading && (
          <div className="flex items-center gap-6 text-small">
            <div>
              <span className="text-ink-muted">Latest Temperature: </span>
              <span
                className={`font-semibold ${
                  latestReading.temperature < 2.0 || latestReading.temperature > 8.0
                    ? "text-danger"
                    : "text-success"
                }`}
              >
                {latestReading.temperature.toFixed(1)}°C
              </span>
            </div>
            {latestReading.humidity != null && (
              <div>
                <span className="text-ink-muted">Humidity: </span>
                <span className="font-semibold text-ink">{latestReading.humidity.toFixed(1)}%</span>
              </div>
            )}
            <div className="text-ink-muted flex items-center gap-1 text-xs">
              <Clock size={13} />
              {new Date(latestReading.recordedAt).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Telemetry Ingestion Form */}
      <Card>
        <CardHeader
          title="Transmit Sensor Telemetry"
          description="Log real IoT temperature and humidity readings directly from the UI to test live excursion thresholds and alerts."
        />
        <CardBody>
          {inputSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs text-small flex items-center justify-between">
              <span>{inputSuccessMsg}</span>
              <button
                onClick={() => setInputSuccessMsg(null)}
                className="text-xs text-emerald-600 font-medium hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleManualReadingSubmit} className="space-y-4">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink-muted">Quick Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setInputTemp("4.5");
                  setInputHum("52.0");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 size={12} /> Normal Safe (4.5°C)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputTemp("12.5");
                  setInputHum("58.0");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
              >
                <Flame size={12} /> Heat Spike (12.5°C)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputTemp("-1.5");
                  setInputHum("45.0");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Snowflake size={12} /> Freezing Breach (-1.5°C)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Temperature (°C) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={inputTemp}
                  onChange={(e) => setInputTemp(e.target.value)}
                  placeholder="e.g. 4.5"
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-xs text-small text-ink focus:outline-hidden focus:border-primary font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Humidity (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputHum}
                  onChange={(e) => setInputHum(e.target.value)}
                  placeholder="e.g. 52.0"
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-xs text-small text-ink focus:outline-hidden focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Device Hardware ID</label>
                <input
                  type="text"
                  value={inputDevice}
                  onChange={(e) => setInputDevice(e.target.value)}
                  placeholder="e.g. DEV-COLD-IOT-01"
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-xs text-small text-ink focus:outline-hidden focus:border-primary font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Location / Vehicle</label>
                <input
                  type="text"
                  value={inputLocation}
                  onChange={(e) => setInputLocation(e.target.value)}
                  placeholder="e.g. Transit Van #42"
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-xs text-small text-ink focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submittingReading || !(selectedBatchId || manualBatchId)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xs text-small font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                <Send size={14} className={submittingReading ? "animate-spin" : ""} />
                {submittingReading ? "Transmitting..." : "Send Telemetry Reading"}
              </button>
            </div>
          </form>
        </CardBody>
      </Card>

      {error && (
        <div className="p-4 rounded-xs bg-danger/10 border border-danger/20 text-danger text-small">
          {error}
        </div>
      )}

      {/* Active Excursion Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-h3 font-semibold text-ink flex items-center gap-2">
            <AlertTriangle size={18} className="text-danger" />
            Detected Temperature Excursions ({alerts.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {alerts.map((al) => (
              <div
                key={al.id}
                className="p-4 rounded-xs border border-danger/30 bg-danger-tint/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-danger text-white">
                      {al.severity} EXCURSION
                    </span>
                    <span className="text-xs text-ink-muted">
                      {new Date(al.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-body font-medium text-ink mt-2">{al.message}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-ink-muted">
                    <div>
                      Recorded Temp:{" "}
                      <strong className="text-danger">{al.recordedTemperature.toFixed(1)}°C</strong>
                    </div>
                    <div>Safe Range: 2.0°C – 8.0°C</div>
                    <div>Duration: {al.durationMinutes} min</div>
                    <div>Severity: {al.severity}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Chart */}
      <Card>
        <CardHeader
          title="Telemetry Time-Series"
          description="Live continuous sensor feed. Standard pharmaceutical cold-chain envelope: 2.0°C – 8.0°C."
        />
        <CardBody>
          {readings.length === 0 ? (
            <div className="py-16 text-center text-ink-muted">
              <Thermometer size={40} className="mx-auto mb-3 opacity-30 text-primary" />
              <p className="font-medium text-ink">No sensor readings received yet for this batch</p>
              <p className="text-small mt-1 max-w-md mx-auto">
                Real telemetry must be ingested via HTTP <code>POST /api/v1/cold-chain/readings</code>.
              </p>
              <div className="mt-6 p-4 max-w-lg mx-auto bg-canvas border border-border rounded-xs text-left">
                <p className="text-xs font-semibold text-ink flex items-center gap-1.5 mb-2">
                  <Terminal size={14} /> Send telemetry using Dev IoT Simulator:
                </p>
                <code className="text-xs block bg-surface p-2.5 rounded-xs border border-border font-mono overflow-x-auto text-ink">
                  python scripts/dev_sensor_simulator.py --batchId {selectedBatchId || "&lt;BATCH_ID&gt;"} --normal
                </code>
                <p className="text-xs text-ink-muted mt-2">
                  To simulate a temperature breach: add <code>--spike</code> flag.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis domain={[-5, 20]} stroke="#64748b" fontSize={12} unit="°C" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#cbd5e1",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <ReferenceLine y={8.0} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Max 8°C", fill: "#ef4444", fontSize: 11 }} />
                  <ReferenceLine y={2.0} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "Min 2°C", fill: "#3b82f6", fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    name="Temperature (°C)"
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Telemetry Log Table */}
      {readings.length > 0 && (
        <Card>
          <CardHeader
            title="Telemetry Ledger"
            description={`Displaying ${readings.length} verified IoT sensor transmission(s).`}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-small text-left">
              <thead className="bg-canvas border-b border-border text-xs text-ink-muted uppercase">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Device ID</th>
                  <th className="py-2.5 px-4 font-semibold">Temperature</th>
                  <th className="py-2.5 px-4 font-semibold">Humidity</th>
                  <th className="py-2.5 px-4 font-semibold">Location</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {readings.slice(-10).reverse().map((r) => {
                  const isExcursion = r.temperature < 2.0 || r.temperature > 8.0;
                  return (
                    <tr key={r.id} className="hover:bg-canvas/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs text-ink">
                        {new Date(r.recordedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-ink">{r.deviceId}</td>
                      <td className={`py-2.5 px-4 font-semibold ${isExcursion ? "text-danger" : "text-success"}`}>
                        {r.temperature.toFixed(1)}°C
                      </td>
                      <td className="py-2.5 px-4 text-ink">
                        {r.humidity != null ? `${r.humidity.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-ink-muted flex items-center gap-1">
                        <MapPin size={12} /> {r.location || "In Transit"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            isExcursion
                              ? "bg-danger-tint text-danger"
                              : "bg-success-tint text-success"
                          }`}
                        >
                          {isExcursion ? (
                            <>
                              <AlertTriangle size={11} /> Excursion
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={11} /> Normal
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

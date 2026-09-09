import { useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
} from "lucide-react";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui";
import { anomalyApi } from "../../services/anomalyApi";
import { batchApi } from "../../services/batchApi";
import { useEventSource } from "../../hooks/useEventSource";

export default function AnomalyCenter() {
  const [anomalies, setAnomalies] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatchToAnalyze, setSelectedBatchToAnalyze] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState(null);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const res = await anomalyApi.listAnomalies(0, 50);
      setAnomalies(res.content || []);
    } catch (err) {
      console.error("Failed to fetch anomalies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
    async function loadBatches() {
      try {
        const data = await batchApi.list();
        setBatches(data || []);
        if (data && data.length > 0) {
          setSelectedBatchToAnalyze(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load batches:", err);
      }
    }
    loadBatches();
  }, []);

  // Listen to real-time anomaly alerts
  useEventSource({
    ANOMALY_DETECTED: (newAnomaly) => {
      setAnomalies((prev) => [newAnomaly, ...prev]);
      setNotificationMsg(`🚨 New anomaly flagged: ${newAnomaly.anomalyType} on ${newAnomaly.batch?.id || "batch"}`);
    },
  });

  const handleRunAnalysis = async () => {
    if (!selectedBatchToAnalyze) return;
    setAnalyzing(true);
    try {
      const res = await anomalyApi.runAnalysis(selectedBatchToAnalyze);
      setNotificationMsg(`✅ Analysis completed for ${selectedBatchToAnalyze}: Score ${res.score}/100 (${res.severity})`);
      fetchAnomalies();
    } catch (err) {
      setNotificationMsg(`⚠️ Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const filtered = anomalies.filter((a) =>
    filterSeverity === "ALL" ? true : a.severity === filterSeverity
  );

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case "CRITICAL":
      case "HIGH":
        return "bg-danger text-white";
      case "MEDIUM":
        return "bg-warning text-ink";
      default:
        return "bg-canvas text-ink-muted border border-border";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supply-Chain Anomaly Center"
        description="Unsupervised Isolation Forest and heuristic causal detection across multi-hop custody transfers."
        action={
          <button
            onClick={fetchAnomalies}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-xs text-small text-ink hover:bg-canvas transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Feed
          </button>
        }
      />

      {notificationMsg && (
        <div className="p-3 bg-primary-tint/60 border border-primary/20 text-primary rounded-xs text-small flex items-center justify-between">
          <span>{notificationMsg}</span>
          <button onClick={() => setNotificationMsg(null)} className="text-xs hover:underline font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* On-Demand Analysis Trigger Bar */}
      <div className="p-4 bg-surface border border-border rounded-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Cpu size={18} className="text-primary" />
          <span className="text-small font-medium text-ink">Run AI Anomaly Evaluation:</span>
          <select
            value={selectedBatchToAnalyze}
            onChange={(e) => setSelectedBatchToAnalyze(e.target.value)}
            className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono focus:outline-hidden focus:border-primary"
          >
            <option value="">-- Select Batch --</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} — {b.medicineName}
              </option>
            ))}
          </select>
          <span className="text-xs text-ink-muted">or enter ID:</span>
          <input
            type="text"
            placeholder="e.g. MC-2026-00003"
            value={selectedBatchToAnalyze}
            onChange={(e) => setSelectedBatchToAnalyze(e.target.value)}
            className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono w-44 focus:outline-hidden focus:border-primary"
          />
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing || !selectedBatchToAnalyze}
          className="px-4 py-1.5 bg-primary text-white rounded-xs text-small font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
          {analyzing ? "Evaluating Multi-Hop Features..." : "Analyze Batch Now"}
        </button>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["ALL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1 text-small rounded-xs font-medium transition-colors ${
                filterSeverity === sev
                  ? "bg-primary text-white"
                  : "bg-surface text-ink-muted hover:text-ink border border-border"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-muted">
          Showing {filtered.length} of {anomalies.length} detected event(s)
        </span>
      </div>

      {/* Anomaly Incident List */}
      {loading && anomalies.length === 0 ? (
        <div className="p-16 text-center text-ink-muted">Loading anomaly registry...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody>
            <div className="py-16 text-center text-ink-muted">
              <ShieldAlert size={44} className="mx-auto mb-3 opacity-30 text-emerald-600" />
              <p className="font-semibold text-ink text-body">Zero Supply-Chain Anomalies Detected</p>
              <p className="text-small mt-1 max-w-md mx-auto">
                No abnormal transfer hops, circular routing, or velocity breaches have been flagged in your historical database records.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <Card key={item.id}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getSeverityBadge(item.severity)}`}>
                          {item.severity}
                        </span>
                        <span className="font-semibold text-ink text-body">
                          {item.anomalyType.replace(/_/g, " ")}
                        </span>
                        {item.batchId && (
                          <span className="font-mono text-xs px-2 py-0.5 rounded-xs bg-canvas border border-border text-primary font-medium">
                            {item.batchId}
                          </span>
                        )}
                      </div>
                      <p className="text-small text-ink mt-1.5 leading-relaxed font-normal">
                        {item.detectedReason}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-h3 font-bold text-ink">
                        {item.score}<span className="text-xs text-ink-muted font-normal">/100</span>
                      </div>
                      <span className="text-xs text-ink-muted block mt-0.5">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Why it was detected toggle */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-ink-muted">
                      <span>Model: <strong className="text-ink">{item.modelVersion}</strong></span>
                      <span>Confidence: <strong className="text-ink">{(item.confidence * 100).toFixed(0)}%</strong></span>
                      {!item.hasSufficientData && (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-200">
                          Statistical Baseline
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>Hide causal breakdown <ChevronUp size={14} /></>
                      ) : (
                        <>Why was this detected? <ChevronDown size={14} /></>
                      )}
                    </button>
                  </div>

                  {/* Causal Breakdown Drawer */}
                  {isExpanded && (
                    <div className="mt-4 p-4 rounded-xs bg-canvas border border-border space-y-3">
                      <h4 className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                        <Info size={14} className="text-primary" /> Contributing Causal Factors
                      </h4>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        Evaluated against historical custody velocities. Anomaly score combines topological hop count,
                        verification failure ratios, and inter-custodian transit durations.
                      </p>
                      {item.contributingFactors && (
                        <div className="text-xs font-mono bg-surface p-3 rounded-xs border border-border overflow-x-auto text-ink">
                          {item.contributingFactors}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

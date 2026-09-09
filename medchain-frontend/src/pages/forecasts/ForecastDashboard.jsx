import { useEffect, useState } from "react";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  RefreshCw,
  Package,
  CheckCircle2,
  Info,
  Calendar,
} from "lucide-react";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui";
import { forecastApi } from "../../services/forecastApi";
import { batchApi } from "../../services/batchApi";

export default function ForecastDashboard() {
  const [tab, setTab] = useState("DEMAND"); // DEMAND or EXPIRY
  const [demandPredictions, setDemandPredictions] = useState([]);
  const [expiryBatches, setExpiryBatches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [singleBatchExpiry, setSingleBatchExpiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchForecasts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [demandData, expiryData, allBatches] = await Promise.all([
        forecastApi.getDemandPredictions(),
        forecastApi.getHighExpiryRisk(),
        batchApi.list(),
      ]);
      setDemandPredictions(demandData || []);
      setExpiryBatches(expiryData || []);
      setBatches(allBatches || []);
      if (allBatches && allBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(allBatches[0].id);
      }
    } catch (err) {
      setError(err.message || "Failed to load forecast data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, []);

  const handlePredictSingleBatch = async (bId) => {
    if (!bId) return;
    try {
      const res = await forecastApi.getExpiryPrediction(bId);
      setSingleBatchExpiry(res);
    } catch (err) {
      console.error("Failed to predict expiry for batch:", err);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      handlePredictSingleBatch(selectedBatchId);
    }
  }, [selectedBatchId]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Demand & Expiry Analytics"
        description="Machine learning linear trend regression and depletion velocity models derived strictly from PostgreSQL transaction logs."
        action={
          <button
            onClick={fetchForecasts}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-xs text-small text-ink hover:bg-canvas transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Recalculate Models
          </button>
        }
      />

      {/* Navigation Tabs */}
      <div className="border-b border-border flex gap-4">
        <button
          onClick={() => setTab("DEMAND")}
          className={`pb-3 text-small font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "DEMAND"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <TrendingUp size={16} /> Demand Forecasting (7 / 30 / 90 Days)
        </button>
        <button
          onClick={() => setTab("EXPIRY")}
          className={`pb-3 text-small font-medium border-b-2 transition-colors flex items-center gap-2 ${
            tab === "EXPIRY"
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Clock size={16} /> Predictive Expiry & Depletion Velocity
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-xs text-small">
          {error}
        </div>
      )}

      {/* TAB 1: DEMAND FORECASTING */}
      {tab === "DEMAND" && (
        <div className="space-y-6">
          {demandPredictions.length === 0 ? (
            <Card>
              <CardBody>
                <div className="py-16 text-center text-ink-muted">
                  <Package size={44} className="mx-auto mb-3 opacity-30 text-primary" />
                  <p className="font-semibold text-ink text-body">No Medicine Records in Database</p>
                  <p className="text-small mt-1 max-w-md mx-auto">
                    Create medicine batches to establish historical inventory data points for demand forecasting.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            demandPredictions.map((dp) => (
              <Card key={dp.id || dp.medicineName}>
                <div className="p-6">
                  {/* Title & Shortage status */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-h3 font-bold text-ink">{dp.medicineName}</h3>
                        {dp.shortageRisk && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger text-white flex items-center gap-1">
                            <AlertTriangle size={12} /> SHORTAGE RISK
                          </span>
                        )}
                        {dp.overstockRisk && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning text-ink">
                            OVERSTOCK RISK
                          </span>
                        )}
                        {!dp.shortageRisk && !dp.overstockRisk && dp.hasSufficientData && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-tint text-success flex items-center gap-1">
                            <CheckCircle2 size={12} /> Balanced Stock
                          </span>
                        )}
                      </div>
                      <p className="text-small text-ink-muted mt-1">
                        Current Physical Inventory:{" "}
                        <strong className="text-ink">{dp.currentStock.toLocaleString()} units</strong>
                      </p>
                    </div>

                    <div className="text-right text-xs text-ink-muted">
                      <div>Model: <span className="font-mono text-ink">{dp.modelType}</span></div>
                      <div>Confidence: <span className="font-semibold text-ink">{(dp.confidence * 100).toFixed(0)}%</span></div>
                    </div>
                  </div>

                  {/* Data Sufficiency Warning if sample count < 3 */}
                  {!dp.hasSufficientData ? (
                    <div className="p-4 rounded-xs bg-amber-50 border border-amber-200 text-amber-900 text-small mb-4 flex items-start gap-3">
                      <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">
                          Insufficient historical data for model training
                        </strong>
                        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                          {dp.explanation} (Observed historical samples: <strong>{dp.sampleCount}</strong>; required minimum: <strong>3</strong>).
                          Predictions will activate automatically once additional batch cycles are logged.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xs bg-primary-tint/30 border border-primary/20 text-ink text-small mb-4">
                      {dp.explanation}
                    </div>
                  )}

                  {/* Projected Demand Horizons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="p-3.5 bg-canvas border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block mb-1">7-Day Forecast</span>
                      <span className="text-h3 font-bold text-ink">
                        {dp.hasSufficientData ? `${dp.predictedDemand7d.toLocaleString()} units` : "—"}
                      </span>
                    </div>
                    <div className="p-3.5 bg-canvas border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block mb-1">30-Day Forecast</span>
                      <span className="text-h3 font-bold text-ink">
                        {dp.hasSufficientData ? `${dp.predictedDemand30d.toLocaleString()} units` : "—"}
                      </span>
                    </div>
                    <div className="p-3.5 bg-canvas border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block mb-1">90-Day Forecast</span>
                      <span className="text-h3 font-bold text-ink">
                        {dp.hasSufficientData ? `${dp.predictedDemand90d.toLocaleString()} units` : "—"}
                      </span>
                    </div>
                    <div className="p-3.5 bg-canvas border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block mb-1">Recommended Safety Stock</span>
                      <span className="text-h3 font-bold text-primary">
                        {dp.hasSufficientData ? `${dp.recommendedStock.toLocaleString()} units` : `${dp.currentStock.toLocaleString()} units`}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* TAB 2: EXPIRY RISK ESTIMATION */}
      {tab === "EXPIRY" && (
        <div className="space-y-6">
          {/* Specific Batch Expiry Inspector */}
          <Card>
            <CardHeader
              title="Batch Expiry & Depletion Velocity Evaluator"
              description="Evaluates empirical burn rate against remaining shelf-life days to calculate projected unused inventory percentage."
            />
            <CardBody>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <label htmlFor="expBatchSelect" className="text-small font-medium text-ink">
                  Select Batch:
                </label>
                <select
                  id="expBatchSelect"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono focus:outline-hidden focus:border-primary"
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.medicineName} ({b.quantity} units)
                    </option>
                  ))}
                </select>
                <span className="text-xs text-ink-muted">or enter ID:</span>
                <input
                  type="text"
                  placeholder="e.g. MC-2026-00003"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono w-44 focus:outline-hidden focus:border-primary"
                />
                <button
                  onClick={() => handlePredictSingleBatch(selectedBatchId)}
                  disabled={!selectedBatchId}
                  className="px-3 py-1.5 bg-primary text-white rounded-xs text-small font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  Evaluate Expiry Risk
                </button>
              </div>

              {singleBatchExpiry && (
                <div className="p-5 bg-canvas border border-border rounded-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-xs bg-surface border border-border text-primary font-bold">
                        {singleBatchExpiry.batchId}
                      </span>
                      <h4 className="text-h3 font-bold text-ink mt-2">
                        {singleBatchExpiry.daysToExpiry} Days Remaining to Expiry
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        singleBatchExpiry.riskLevel === "CRITICAL" || singleBatchExpiry.riskLevel === "HIGH"
                          ? "bg-danger text-white"
                          : singleBatchExpiry.riskLevel === "MEDIUM"
                          ? "bg-warning text-ink"
                          : "bg-success text-white"
                      }`}
                    >
                      {singleBatchExpiry.riskLevel} EXPIRY RISK
                    </span>
                  </div>

                  <p className="text-small text-ink leading-relaxed">
                    {singleBatchExpiry.explanation}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 bg-surface border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block">Current Quantity</span>
                      <span className="text-body font-bold text-ink">
                        {singleBatchExpiry.currentQuantity.toLocaleString()} units
                      </span>
                    </div>
                    <div className="p-3 bg-surface border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block">Daily Depletion Rate</span>
                      <span className="text-body font-bold text-ink">
                        {singleBatchExpiry.dailyBurnRate.toFixed(1)} units/day
                      </span>
                    </div>
                    <div className="p-3 bg-surface border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block">Projected Movement</span>
                      <span className="text-body font-bold text-ink">
                        {singleBatchExpiry.predictedMovement.toLocaleString()} units
                      </span>
                    </div>
                    <div className="p-3 bg-surface border border-border rounded-xs">
                      <span className="text-xs text-ink-muted block">Estimated Unused at Expiry</span>
                      <span className="text-body font-bold text-danger">
                        {singleBatchExpiry.estimatedRemaining.toLocaleString()} ({singleBatchExpiry.remainingPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

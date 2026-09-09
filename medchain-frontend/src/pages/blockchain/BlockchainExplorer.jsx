import { useEffect, useState } from "react";
import {
  Blocks,
  Search,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Hash,
  Clock,
  Layers,
  FileCheck,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { PageHeader, Card, CardHeader, CardBody } from "../../components/ui";
import { blockchainApi } from "../../services/blockchainApi";
import { batchApi } from "../../services/batchApi";

export default function BlockchainExplorer() {
  const [events, setEvents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [timelineData, setTimelineData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchExplorerData = async () => {
    setLoading(true);
    try {
      const [eventsData, allBatches] = await Promise.all([
        blockchainApi.getExplorerEvents(0, 50),
        batchApi.list(),
      ]);
      setEvents(eventsData.content || []);
      setBatches(allBatches || []);
      if (allBatches && allBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(allBatches[0].id);
      }
    } catch (err) {
      console.error("Failed to load blockchain explorer data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorerData();
  }, []);

  useEffect(() => {
    async function loadTimeline() {
      if (!selectedBatchId) return;
      try {
        const data = await blockchainApi.getBatchTimeline(selectedBatchId);
        setTimelineData(data);
      } catch (err) {
        console.error("Failed to load custody timeline:", err);
      }
    }
    loadTimeline();
  }, [selectedBatchId]);

  const filteredEvents = events.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      e.txHash.toLowerCase().includes(q) ||
      e.batchId.toLowerCase().includes(q) ||
      e.eventType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blockchain Explorer"
        description="Immutable EVM ledger tracking authentic smart contract transaction receipts for medicine batches."
        action={
          <button
            onClick={fetchExplorerData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-xs text-small text-ink hover:bg-canvas transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Blocks
          </button>
        }
      />

      {/* Chain-of-Custody Visual Timeline */}
      <Card>
        <CardHeader
          title="Interactive Custody Chain Timeline"
          description="Track cryptographic chain-of-custody handoffs and verified on-chain event proofs for any batch."
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <label htmlFor="timelineSelect" className="text-small font-medium text-ink">
              Select Batch:
            </label>
            <select
              id="timelineSelect"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono focus:outline-hidden focus:border-primary"
            >
              <option value="">-- Select Batch --</option>
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
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink font-mono w-44 focus:outline-hidden focus:border-primary"
            />
          </div>

          {timelineData ? (
            <div className="py-4">
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-2">
                {timelineData.timeline.map((step, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center text-center relative w-full md:w-auto">
                    {/* Connecting line */}
                    {idx < timelineData.timeline.length - 1 && (
                      <div className="hidden md:block absolute top-5 left-1/2 w-full h-0.5 bg-primary/30 -z-0" />
                    )}

                    <div
                      onClick={() => step.txHash && setSelectedTx(step)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center relative z-10 transition-transform hover:scale-105 cursor-pointer shadow-xs ${
                        step.isBlockchainConfirmed
                          ? "bg-primary text-white"
                          : "bg-surface border-2 border-border text-ink-muted"
                      }`}
                      title={step.txHash ? "Click to view on-chain receipt" : "Pending on-chain confirmation"}
                    >
                      {step.isBlockchainConfirmed ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>

                    <div className="mt-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">
                        {step.stage.replace(/_/g, " ")}
                      </span>
                      <p className="text-small font-semibold text-ink mt-0.5">{step.title}</p>
                      <p className="text-xs text-ink-muted mt-0.5 max-w-[160px] mx-auto truncate">
                        {step.actor}
                      </p>
                      {step.txHash && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline mt-1">
                          {step.txHash.slice(0, 8)}...{step.txHash.slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-small text-ink-muted py-6 text-center">No timeline records found for this batch.</p>
          )}
        </CardBody>
      </Card>

      {/* Explorer Search Bar */}
      <div className="p-4 bg-surface border border-border rounded-xs flex items-center gap-3">
        <Search size={18} className="text-ink-muted shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by transaction hash (0x...), batch ID (MC-2026-...), or event type..."
          className="flex-1 bg-transparent text-small text-ink placeholder:text-ink-muted focus:outline-hidden font-mono"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="text-xs text-ink-muted hover:text-ink">
            Clear
          </button>
        )}
      </div>

      {/* On-Chain Transaction Table */}
      <Card>
        <CardHeader
          title="On-Chain Event Ledger"
          description={`Verified smart contract events recorded by the backend relayer on Hardhat.`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-small text-left">
            <thead className="bg-canvas border-b border-border text-xs text-ink-muted uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Tx Hash</th>
                <th className="py-3 px-4 font-semibold">Block #</th>
                <th className="py-3 px-4 font-semibold">Batch ID</th>
                <th className="py-3 px-4 font-semibold">Event Type</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-muted">
                    No blockchain transactions match your query.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedTx(evt)}
                    className="hover:bg-canvas/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-primary font-medium">
                      <div className="flex items-center gap-1.5">
                        <Hash size={13} className="text-ink-muted" />
                        {evt.txHash.slice(0, 10)}...{evt.txHash.slice(-8)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-ink">
                      #{evt.blockNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-ink">
                      {evt.batchId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-primary-tint text-primary border border-primary/20">
                        {evt.eventType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-ink-muted">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Confirmed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={() => setSelectedTx(null)} />
          <div className="relative bg-surface border border-border rounded-xs shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-h3 font-bold text-ink flex items-center gap-2">
                <Blocks size={20} className="text-primary" /> On-Chain Transaction Receipt
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-ink-muted hover:text-ink text-xs font-bold px-2 py-1 bg-canvas rounded-xs"
              >
                ESC
              </button>
            </div>

            <div className="space-y-3 text-small">
              <div>
                <span className="text-xs text-ink-muted block mb-0.5">Transaction Hash</span>
                <span className="font-mono text-xs bg-canvas p-2 rounded-xs border border-border block text-ink break-all select-all">
                  {selectedTx.txHash}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-ink-muted block">Block Number</span>
                  <span className="font-mono text-small font-bold text-ink">#{selectedTx.blockNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-muted block">Status</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Confirmed On-Chain
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-ink-muted block">Batch Associated</span>
                <span className="font-mono font-semibold text-primary">{selectedTx.batchId || selectedBatchId}</span>
              </div>

              <div>
                <span className="text-xs text-ink-muted block">Smart Contract Address</span>
                <span className="font-mono text-xs text-ink bg-canvas p-1.5 rounded-xs border border-border block select-all">
                  0x5FbDB2315678afecb367f032d93F642f64180aa3 (MedicineTraceability.sol)
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border text-right">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-1.5 bg-canvas border border-border rounded-xs text-small text-ink hover:bg-surface font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

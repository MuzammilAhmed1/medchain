import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  QrCode,
  Truck,
  Building2,
  Lock,
  Cpu,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";
import { Button, Input } from "../../components/ui";

export default function Landing() {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickQuery, setQuickQuery] = useState("");

  const handleQuickVerify = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      navigate(`/verify?query=${encodeURIComponent(quickQuery.trim().toUpperCase())}`);
    }
  };

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-tint text-primary text-small font-medium mb-6">
              <ShieldCheck size={16} />
              <span>Blockchain-Powered Pharmaceutical Traceability</span>
            </div>
            <h1 className="text-h1 md:text-[44px] md:leading-[52px] text-ink font-bold tracking-tight">
              Track every medicine. <br className="hidden sm:inline" />
              Verify every step.
            </h1>
            <p className="text-body text-ink-muted mt-5 max-w-xl text-lg leading-relaxed">
              MedChain monitors pharmaceutical batches from manufacturing plant to retail dispensary,
              recording every custodial handoff on an immutable blockchain ledger so patients, pharmacies,
              and regulators can instantly verify authentic medicine.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <Link to="/register">
                <Button size="md" className="flex items-center gap-2 shadow-sm">
                  Get started <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="secondary" size="md" className="flex items-center gap-2">
                  <Search size={16} />
                  Verify medicine
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="border border-border rounded-lg p-6 bg-surface shadow-sm">
              <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
                <div className="p-2.5 rounded-md bg-primary-tint text-primary">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-h3 font-semibold text-ink">Verify Medicine Batch</h3>
                  <p className="text-small text-ink-muted">Public blockchain authenticity lookup</p>
                </div>
              </div>

              <form onSubmit={handleQuickVerify} className="flex flex-col gap-4">
                <Input
                  label="Batch Identifier"
                  placeholder="Enter Batch ID (e.g. MC-2026-00001)"
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full flex items-center justify-center gap-2">
                  <Search size={16} /> Verify Authenticity
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-ink-muted">
                <span>✓ Tamper-proof Ethereum ledger</span>
                <span>✓ Zero login required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-t border-border bg-surface py-20 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-label text-primary uppercase tracking-wider font-semibold mb-2">
              End-to-End Traceability
            </p>
            <h2 className="text-h2 md:text-3xl font-bold text-ink mb-4">
              How MedChain Works
            </h2>
            <p className="text-body text-ink-muted">
              A transparent, decentralized custody pipeline ensuring no unauthorized or counterfeit
              medicines bypass regulatory checkpoints.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                icon: <Building2 className="text-primary" size={24} />,
                title: "1. Manufacturer",
                desc: "Registers the medicine batch with production dates, quantity, and mints a unique cryptographic batch ID and QR code on-chain.",
              },
              {
                step: "02",
                icon: <Truck className="text-primary" size={24} />,
                title: "2. Distributor",
                desc: "Receives custody after scanning shipment seals. Initiates secure dispatch to licensed retail and clinical pharmacies.",
              },
              {
                step: "03",
                icon: <ShieldCheck className="text-primary" size={24} />,
                title: "3. Pharmacy",
                desc: "Takes custody as the final dispensing point. Confirms batch integrity before dispensing prescription drugs to patients.",
              },
              {
                step: "04",
                icon: <QrCode className="text-primary" size={24} />,
                title: "4. Public Verification",
                desc: "Doctors, pharmacists, and consumers scan the physical package QR code with any camera to verify origin and authenticity in seconds.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-border rounded-lg p-6 bg-canvas hover:border-primary/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-md bg-surface border border-border">
                      {item.icon}
                    </div>
                    <span className="font-mono text-sm text-ink-muted font-bold">{item.step}</span>
                  </div>
                  <h3 className="text-h3 font-semibold text-ink mb-2">{item.title}</h3>
                  <p className="text-small text-ink-muted leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border bg-canvas py-20 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-label text-primary uppercase tracking-wider font-semibold mb-2">
              Production Capabilities
            </p>
            <h2 className="text-h2 md:text-3xl font-bold text-ink mb-4">
              Built for Safety, Speed, & Trust
            </h2>
            <p className="text-body text-ink-muted">
              Every feature is engineered to eradicate counterfeit pharmaceuticals and streamline regulatory compliance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="border border-border rounded-lg p-6 bg-surface">
              <div className="p-3 rounded-md bg-primary-tint text-primary w-fit mb-4">
                <Lock size={22} />
              </div>
              <h3 className="text-h3 font-semibold text-ink mb-2">Role-Based Custody Rules</h3>
              <p className="text-small text-ink-muted leading-relaxed">
                Strict progression prevents illegitimate jumps: Manufacturers can only ship to Distributors,
                Distributors only to Pharmacies, and unauthorized handoffs are rejected automatically.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6 bg-surface">
              <div className="p-3 rounded-md bg-primary-tint text-primary w-fit mb-4">
                <Cpu size={22} />
              </div>
              <h3 className="text-h3 font-semibold text-ink mb-2">AI Risk Intelligence</h3>
              <p className="text-small text-ink-muted leading-relaxed">
                FastAPI risk evaluation engine scans supply-chain velocity, transit anomalies, recall alerts,
                and expiration thresholds, automatically flagging high-risk batches.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6 bg-surface">
              <div className="p-3 rounded-md bg-primary-tint text-primary w-fit mb-4">
                <QrCode size={22} />
              </div>
              <h3 className="text-h3 font-semibold text-ink mb-2">Dual-Mode QR Verification</h3>
              <p className="text-small text-ink-muted leading-relaxed">
                Scan instantly using any live camera stream or upload high-resolution package images directly
                in the browser without installing dedicated barcode hardware.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6 bg-surface">
              <div className="p-3 rounded-md bg-primary-tint text-primary w-fit mb-4">
                <Database size={22} />
              </div>
              <h3 className="text-h3 font-semibold text-ink mb-2">Immutable Blockchain Audit</h3>
              <p className="text-small text-ink-muted leading-relaxed">
                Every batch lifecycle transition is committed to smart contracts on Ethereum, generating
                verifiable cryptographic transaction receipts and block timestamps.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6 bg-surface">
              <div className="p-3 rounded-md bg-primary-tint text-primary w-fit mb-4">
                <Activity size={22} />
              </div>
              <h3 className="text-h3 font-semibold text-ink mb-2">Live Activity Telemetry</h3>
              <p className="text-small text-ink-muted leading-relaxed">
                Real-time dashboard analytics, custody charts, and continuous audit feeds give administrators
                and regulators end-to-end visibility over national distribution channels.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6 bg-surface">
              <div className="p-3 rounded-md bg-primary-tint text-primary w-fit mb-4">
                <Layers size={22} />
              </div>
              <h3 className="text-h3 font-semibold text-ink mb-2">Instant Recall Containment</h3>
              <p className="text-small text-ink-muted leading-relaxed">
                Manufacturers can trigger global recalls that immediately lock digital transfers and flag
                public QR verification screens with high-contrast quarantine alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" className="border-t border-border bg-surface py-20 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-label text-primary uppercase tracking-wider font-semibold mb-2">
              Architecture & Stack
            </p>
            <h2 className="text-h2 md:text-3xl font-bold text-ink mb-4">
              Modern Enterprise Technology
            </h2>
            <p className="text-body text-ink-muted">
              Built across four specialized, resilient tiers engineered for horizontal scalability and high availability.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="border border-border rounded-lg p-5 bg-canvas">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Smart Contracts</span>
              <h4 className="text-h3 font-semibold text-ink mt-1 mb-2">Solidity & Hardhat</h4>
              <p className="text-small text-ink-muted">
                EVM smart contracts with access control modifiers enforcing immutable ownership records on-chain.
              </p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-canvas">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Core Backend</span>
              <h4 className="text-h3 font-semibold text-ink mt-1 mb-2">Spring Boot 3</h4>
              <p className="text-small text-ink-muted">
                Java 17 REST API, Spring Security with stateless JWTs, Hibernate JPA, and Web3j Ethereum integration.
              </p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-canvas">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">AI Service</span>
              <h4 className="text-h3 font-semibold text-ink mt-1 mb-2">Python & FastAPI</h4>
              <p className="text-small text-ink-muted">
                High-performance asynchronous risk evaluation engine scoring transit, shelf life, and tampering patterns.
              </p>
            </div>

            <div className="border border-border rounded-lg p-5 bg-canvas">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Client App</span>
              <h4 className="text-h3 font-semibold text-ink mt-1 mb-2">React 19 & Vite</h4>
              <p className="text-small text-ink-muted">
                Tailwind CSS design system, Recharts data visualization, and client-side jsQR optical scanning.
              </p>
            </div>
          </div>

          <div className="mt-16 p-8 border border-border rounded-xl bg-canvas text-center max-w-2xl mx-auto">
            <h3 className="text-h2 text-ink font-bold mb-3">Ready to explore the supply chain?</h3>
            <p className="text-body text-ink-muted mb-6">
              Create an account with any role or test public medicine verification without logging in.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button size="md">Create an account</Button>
              </Link>
              <Link to="/verify">
                <Button variant="secondary" size="md">Test Verification Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

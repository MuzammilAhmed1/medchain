import { Link } from "react-router-dom";
import { Button } from "../../components/ui";

// Phase 4 gives this page real structure and working CTAs so the shell
// is demoable end to end. Phase 5 replaces this with the full landing
// treatment from section 10 of the brief (trust section, feature grid, etc).
export default function Landing() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-2xl">
          <h1 className="text-h1 md:text-[38px] md:leading-[46px] text-ink">
            Track every medicine. Verify every step.
          </h1>
          <p className="text-body text-ink-muted mt-4 max-w-lg">
            MedChain follows a medicine batch from manufacturer to pharmacy,
            recording every handoff on a tamper-resistant ledger so anyone
            can confirm what they are holding is authentic.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/register">
              <Button size="md">Get started</Button>
            </Link>
            <Link to="/verify">
              <Button variant="secondary" size="md">
                Verify medicine
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-14">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <h2 className="text-h2 text-ink mb-8">How MedChain works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Manufacturer", desc: "Creates the batch and generates its QR code." },
              { title: "Distributor", desc: "Receives the shipment and forwards it onward." },
              { title: "Pharmacy", desc: "Receives the batch and dispenses to patients." },
              { title: "Verification", desc: "Anyone can scan the QR to confirm authenticity." },
            ].map((step) => (
              <div key={step.title} className="border border-border rounded-md p-5">
                <h3 className="text-h3 text-ink mb-1">{step.title}</h3>
                <p className="text-small text-ink-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

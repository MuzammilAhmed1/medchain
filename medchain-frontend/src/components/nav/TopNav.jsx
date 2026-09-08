import { Link } from "react-router-dom";
import Button from "../ui/Button";

export default function TopNav() {
  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 md:px-10">
      <Link to="/" className="text-h3 text-ink font-bold">
        MedChain
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-body text-ink-muted">
        <a href="#how-it-works" className="hover:text-ink">How it works</a>
        <a href="#features" className="hover:text-ink">Features</a>
        <a href="#trust" className="hover:text-ink">Technology</a>
      </nav>
      <div className="flex items-center gap-3">
        <Link to="/login" className="text-body text-ink-muted hover:text-ink hidden sm:block">
          Log in
        </Link>
        <Link to="/register">
          <Button size="sm">Get started</Button>
        </Link>
      </div>
    </header>
  );
}

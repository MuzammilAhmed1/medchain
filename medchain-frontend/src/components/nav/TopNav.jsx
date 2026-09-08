import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../ui/Button";

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (sectionId) => (e) => {
    e.preventDefault();
    if (location.pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 md:px-10 sticky top-0 z-50 backdrop-blur-sm bg-surface/95">
      <Link to="/" className="text-h3 text-ink font-bold tracking-tight">
        MedChain
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-body text-ink-muted">
        <button
          type="button"
          onClick={handleNavClick("how-it-works")}
          className="hover:text-ink transition-colors cursor-pointer bg-transparent border-0 text-inherit font-inherit p-0"
        >
          How it works
        </button>
        <button
          type="button"
          onClick={handleNavClick("features")}
          className="hover:text-ink transition-colors cursor-pointer bg-transparent border-0 text-inherit font-inherit p-0"
        >
          Features
        </button>
        <button
          type="button"
          onClick={handleNavClick("technology")}
          className="hover:text-ink transition-colors cursor-pointer bg-transparent border-0 text-inherit font-inherit p-0"
        >
          Technology
        </button>
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

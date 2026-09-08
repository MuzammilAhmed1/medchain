import { Link } from "react-router-dom";
import { Button } from "../../components/ui";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-h2 text-ink mb-2">Page not found</h1>
      <p className="text-body text-ink-muted mb-6">The page you are looking for does not exist.</p>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}

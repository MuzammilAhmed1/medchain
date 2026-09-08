import { useEffect, useState } from "react";

// Runs `fn` on mount (and whenever `deps` changes), tracking loading/error/data.
// Every page-level data fetch in the app uses this so loading and error
// handling stays consistent instead of being re-implemented per page.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, data: null });

    fn()
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: err.message || "Something went wrong.", data: null });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const SLOW_REQUEST_MS = 3_000;

/** The free API host sleeps when idle, and its first request can take about a minute. */
export function WakeNotice() {
  const busy = useIsFetching() + useIsMutating() > 0;
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => {
      setSlow(true);
    }, SLOW_REQUEST_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [busy]);

  if (!slow) return null;
  return (
    <div
      role="status"
      className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-sm text-sky-900"
    >
      Despertando el servidor… La primera petición puede tardar hasta un minuto.
    </div>
  );
}

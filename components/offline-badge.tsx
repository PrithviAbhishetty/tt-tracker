"use client";

import { useEffect, useState } from "react";
import { getPendingCount, syncNow, subscribeToQueue } from "@/lib/offline/sync";

export function OfflineBadge() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    getPendingCount().then(setPending);

    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const unsub = subscribeToQueue((count) => setPending(count));

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      unsub();
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className="text-xs px-4 py-1.5 border-b border-paper-edge/40 flex items-center justify-between gap-3 text-ink-on-paper"
      style={{ background: "rgba(122, 58, 54, 0.32)" }}
    >
      <span className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-paper-light/80" />
        {!online ? "Offline · matches stored locally" : `${pending} match${pending === 1 ? "" : "es"} queued`}
      </span>
      {online && pending > 0 && (
        <button
          type="button"
          onClick={() => void syncNow()}
          className="text-accent hover:text-paper-light transition underline underline-offset-2"
        >
          Sync now
        </button>
      )}
    </div>
  );
}

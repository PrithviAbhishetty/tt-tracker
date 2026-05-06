import type { MatchRecord } from "@/lib/types";
import { bumpAttempts, dequeue, enqueue, listQueued, pendingCount } from "./queue";

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

function notify() {
  pendingCount()
    .then((n) => listeners.forEach((l) => l(n)))
    .catch(() => {});
}

export function subscribeToQueue(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getPendingCount(): Promise<number> {
  return pendingCount();
}

/**
 * Records a match. If online, posts directly. If offline (or the post fails),
 * enqueues to IndexedDB for later sync. Returns "synced" if the server accepted
 * the match, "queued" if it landed in the offline queue.
 */
export async function recordMatch(match: MatchRecord): Promise<"synced" | "queued"> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(match),
      });
      if (res.ok) {
        notify();
        return "synced";
      }
      // 4xx = client error, don't queue (would just keep failing)
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server rejected match (${res.status})`);
      }
    } catch (e) {
      // Network error or 5xx — fall through to queue
      if (e instanceof Error && e.message.startsWith("Server rejected")) throw e;
    }
  }

  await enqueue(match);
  notify();
  return "queued";
}

/** Flush the queue. Called on `online` event, app focus, manual button. */
export async function syncNow(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  const queued = await listQueued();
  let synced = 0;
  let failed = 0;
  for (const row of queued) {
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(row.payload),
      });
      if (res.ok) {
        await dequeue(row.client_uuid);
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        // Permanently bad payload — drop it to avoid infinite retries.
        await dequeue(row.client_uuid);
        failed++;
      } else {
        await bumpAttempts(row.client_uuid);
        failed++;
      }
    } catch {
      await bumpAttempts(row.client_uuid);
      failed++;
    }
  }
  notify();
  return { synced, failed };
}

// Auto-flush on app focus and reconnect.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
}

import type { MatchRecord, PlayerRow } from "@/lib/types";
import {
  bumpAttempts,
  dequeue,
  enqueue,
  listQueued,
  pendingCount,
  updateQueuedPayload,
} from "./queue";
import {
  dequeuePendingPlayer,
  isTempPlayerId,
  listPendingPlayers,
  putCachedPlayer,
} from "./players-cache";

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

async function totalPending(): Promise<number> {
  const matches = await pendingCount();
  const players = (await listPendingPlayers()).length;
  return matches + players;
}

function notify() {
  totalPending()
    .then((n) => listeners.forEach((l) => l(n)))
    .catch(() => {});
}

export function subscribeToQueue(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getPendingCount(): Promise<number> {
  return totalPending();
}

/**
 * Records a match. If online, posts directly. If offline (or the post fails),
 * enqueues to IndexedDB for later sync. Returns "synced" if the server accepted
 * the match, "queued" if it landed in the offline queue.
 */
export async function recordMatch(match: MatchRecord): Promise<"synced" | "queued"> {
  // If any side has a temp player ID, we must queue — server can't resolve them.
  const hasTempIds = [...match.side1_player_ids, ...match.side2_player_ids].some(
    isTempPlayerId,
  );

  if (!hasTempIds && typeof navigator !== "undefined" && navigator.onLine) {
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
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server rejected match (${res.status})`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Server rejected")) throw e;
    }
  }

  await enqueue(match);
  notify();
  return "queued";
}

/**
 * Flush queued players first, building a temp_id → real_id map. Then rewrite
 * any queued matches that referenced those temp IDs and flush them.
 */
export async function syncNow(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  // 1. Flush pending players, build id-map.
  const pendingPlayers = await listPendingPlayers();
  const idMap = new Map<string, string>();
  for (const p of pendingPlayers) {
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ display_name: p.display_name }),
      });
      if (res.ok) {
        const player = (await res.json()) as PlayerRow;
        idMap.set(p.temp_id, player.id);
        await putCachedPlayer(player);
        await dequeuePendingPlayer(p.temp_id);
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        // Bad payload (duplicate name, etc.) — drop to avoid infinite retries.
        await dequeuePendingPlayer(p.temp_id);
        failed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // 2. Rewrite queued matches whose payloads reference any newly-resolved temp IDs.
  if (idMap.size > 0) {
    const queued = await listQueued();
    for (const row of queued) {
      const before = row.payload;
      const rewriteSide = (ids: string[]) => ids.map((id) => idMap.get(id) ?? id);
      const next: MatchRecord = {
        ...before,
        side1_player_ids: rewriteSide(before.side1_player_ids),
        side2_player_ids: rewriteSide(before.side2_player_ids),
      };
      if (
        next.side1_player_ids.some((id, i) => id !== before.side1_player_ids[i]) ||
        next.side2_player_ids.some((id, i) => id !== before.side2_player_ids[i])
      ) {
        await updateQueuedPayload(row.client_uuid, next);
      }
    }
  }

  // 3. Flush match queue. Skip rows that still contain temp IDs (player sync failed).
  const queued = await listQueued();
  for (const row of queued) {
    const stillTemp = [
      ...row.payload.side1_player_ids,
      ...row.payload.side2_player_ids,
    ].some(isTempPlayerId);
    if (stillTemp) {
      failed++;
      continue;
    }
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

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
}

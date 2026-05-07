import { v4 as uuidv4 } from "uuid";
import type { PlayerRow } from "@/lib/types";
import {
  getDb,
  STORE_KV,
  STORE_PENDING_PLAYERS,
  STORE_PLAYERS_CACHE,
} from "./db";

const TEMP_ID_PREFIX = "temp_";

export function isTempPlayerId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

export interface PendingPlayerRow {
  temp_id: string;
  display_name: string;
  queued_at: string;
}

export async function cachePlayers(players: PlayerRow[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_PLAYERS_CACHE, "readwrite");
  await tx.store.clear();
  for (const p of players) {
    await tx.store.put(p);
  }
  await tx.done;
}

export async function getCachedPlayers(): Promise<PlayerRow[]> {
  const db = await getDb();
  const cached = (await db.getAll(STORE_PLAYERS_CACHE)) as PlayerRow[];
  const pending = (await db.getAll(STORE_PENDING_PLAYERS)) as PendingPlayerRow[];
  const pendingPlayers: PlayerRow[] = pending.map((p) => ({
    id: p.temp_id,
    display_name: p.display_name,
    user_id: null,
    elo_rating: 1200,
    games_played: 0,
    is_active: true,
  }));
  return [...cached, ...pendingPlayers].sort((a, b) =>
    a.display_name.localeCompare(b.display_name),
  );
}

/** Network-first: fetch from /api/players, cache on success, fall back to IDB. */
export async function fetchPlayers(): Promise<PlayerRow[]> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/players", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as PlayerRow[];
        await cachePlayers(data);
        return getCachedPlayers();
      }
    } catch {
      // fall through
    }
  }
  return getCachedPlayers();
}

/**
 * Create a guest player. If online, posts immediately and caches the result.
 * If offline, generates a temp ID and queues the create. Returns a PlayerRow
 * (with a temp ID when offline) so the UI can immediately select them.
 */
export async function createPlayer(
  display_name: string,
): Promise<{ player: PlayerRow; status: "synced" | "queued" }> {
  const name = display_name.trim();
  if (!name) throw new Error("Name required");

  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ display_name: name }),
      });
      if (res.ok) {
        const player = (await res.json()) as PlayerRow;
        const db = await getDb();
        await db.put(STORE_PLAYERS_CACHE, player);
        return { player, status: "synced" };
      }
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server rejected (${res.status})`);
      }
    } catch (e) {
      if (e instanceof Error && /Server rejected/.test(e.message)) throw e;
      // network/5xx — fall through to queue
    }
  }

  const temp_id = `${TEMP_ID_PREFIX}${uuidv4()}`;
  const row: PendingPlayerRow = {
    temp_id,
    display_name: name,
    queued_at: new Date().toISOString(),
  };
  const db = await getDb();
  await db.put(STORE_PENDING_PLAYERS, row);
  const player: PlayerRow = {
    id: temp_id,
    display_name: name,
    user_id: null,
    elo_rating: 1200,
    games_played: 0,
    is_active: true,
  };
  return { player, status: "queued" };
}

export async function listPendingPlayers(): Promise<PendingPlayerRow[]> {
  const db = await getDb();
  return (await db.getAll(STORE_PENDING_PLAYERS)) as PendingPlayerRow[];
}

export async function dequeuePendingPlayer(temp_id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PENDING_PLAYERS, temp_id);
}

export async function putCachedPlayer(player: PlayerRow): Promise<void> {
  const db = await getDb();
  await db.put(STORE_PLAYERS_CACHE, player);
}

interface LeaderboardSnapshot {
  players: PlayerRow[];
  matches: number;
  fetched_at: string;
}

const KV_LEADERBOARD = "leaderboard";

export async function fetchLeaderboard(): Promise<LeaderboardSnapshot> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/leaderboard", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { players: PlayerRow[]; matches: number };
        const snap: LeaderboardSnapshot = {
          players: data.players,
          matches: data.matches,
          fetched_at: new Date().toISOString(),
        };
        const db = await getDb();
        await db.put(STORE_KV, { key: KV_LEADERBOARD, value: snap });
        await cachePlayers(data.players);
        return snap;
      }
    } catch {
      // fall through
    }
  }
  const db = await getDb();
  const row = (await db.get(STORE_KV, KV_LEADERBOARD)) as
    | { key: string; value: LeaderboardSnapshot }
    | undefined;
  if (row) return row.value;
  return { players: [], matches: 0, fetched_at: new Date(0).toISOString() };
}

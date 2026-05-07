import type { MatchRecord } from "@/lib/types";
import { getDb, STORE_PENDING_MATCHES } from "./db";

interface QueueRow {
  client_uuid: string;
  payload: MatchRecord;
  queued_at: string;
  attempts: number;
}

export async function enqueue(match: MatchRecord): Promise<void> {
  const db = await getDb();
  const row: QueueRow = {
    client_uuid: match.client_uuid,
    payload: match,
    queued_at: new Date().toISOString(),
    attempts: 0,
  };
  await db.put(STORE_PENDING_MATCHES, row);
}

export async function dequeue(client_uuid: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_PENDING_MATCHES, client_uuid);
}

export async function bumpAttempts(client_uuid: string): Promise<void> {
  const db = await getDb();
  const row = (await db.get(STORE_PENDING_MATCHES, client_uuid)) as QueueRow | undefined;
  if (!row) return;
  row.attempts += 1;
  await db.put(STORE_PENDING_MATCHES, row);
}

export async function listQueued(): Promise<QueueRow[]> {
  const db = await getDb();
  return (await db.getAll(STORE_PENDING_MATCHES)) as QueueRow[];
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_PENDING_MATCHES);
}

export async function updateQueuedPayload(
  client_uuid: string,
  payload: MatchRecord,
): Promise<void> {
  const db = await getDb();
  const row = (await db.get(STORE_PENDING_MATCHES, client_uuid)) as QueueRow | undefined;
  if (!row) return;
  row.payload = payload;
  await db.put(STORE_PENDING_MATCHES, row);
}

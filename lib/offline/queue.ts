import { openDB, type IDBPDatabase } from "idb";
import type { MatchRecord } from "@/lib/types";

const DB_NAME = "tt-tracker";
const DB_VERSION = 1;
const STORE = "pending_matches";

interface QueueRow {
  client_uuid: string;
  payload: MatchRecord;
  queued_at: string;
  attempts: number;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "client_uuid" });
      }
    },
  });
}

export async function enqueue(match: MatchRecord): Promise<void> {
  const db = await getDb();
  const row: QueueRow = {
    client_uuid: match.client_uuid,
    payload: match,
    queued_at: new Date().toISOString(),
    attempts: 0,
  };
  await db.put(STORE, row);
}

export async function dequeue(client_uuid: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, client_uuid);
}

export async function bumpAttempts(client_uuid: string): Promise<void> {
  const db = await getDb();
  const row = (await db.get(STORE, client_uuid)) as QueueRow | undefined;
  if (!row) return;
  row.attempts += 1;
  await db.put(STORE, row);
}

export async function listQueued(): Promise<QueueRow[]> {
  const db = await getDb();
  return (await db.getAll(STORE)) as QueueRow[];
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE);
}

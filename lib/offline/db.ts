import { openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "tt-tracker";
export const DB_VERSION = 2;

export const STORE_PENDING_MATCHES = "pending_matches";
export const STORE_PLAYERS_CACHE = "players_cache";
export const STORE_PENDING_PLAYERS = "pending_players";
export const STORE_KV = "kv";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(STORE_PENDING_MATCHES, { keyPath: "client_uuid" });
        }
        if (oldVersion < 2) {
          db.createObjectStore(STORE_PLAYERS_CACHE, { keyPath: "id" });
          db.createObjectStore(STORE_PENDING_PLAYERS, { keyPath: "temp_id" });
          db.createObjectStore(STORE_KV, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================
// lib/offlineCache.ts
// SchoraHub — Offline-First IndexedDB Cache
// ============================================================

const DB_NAME = "schorahub_offline";
const DB_VERSION = 1;

export const STORES = [
  "resources",
  "scholarships",
  "tutors",
  "purchases",
  "bookmarks",
  "audiobooks",
  "audiobook_purchases",
  "audiobook_bookmarks",
  "universities",
  "bookshops",
  "bookshop_stats",
  "adverts",
  "session",
] as const;

export type StoreName = typeof STORES[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB not supported in this browser"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

export async function setCache<T extends { id: string }>(
  store: StoreName,
  rows: T[]
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const os = tx.objectStore(store);
      os.clear();
      for (const row of rows) os.put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn(`[offlineCache] setCache failed for "${store}":`, e);
  }
}

export async function getCache<T = any>(store: StoreName): Promise<T[]> {
  try {
    const db = await openDb();
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`[offlineCache] getCache failed for "${store}":`, e);
    return [];
  }
}

export async function putRow<T extends { id: string }>(
  store: StoreName,
  row: T
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(row);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn(`[offlineCache] putRow failed for "${store}":`, e);
  }
}

export async function getRow<T = any>(store: StoreName, id: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn(`[offlineCache] getRow failed for "${store}":`, e);
    return null;
  }
}

export async function setValue(key: string, value: any): Promise<void> {
  return putRow("session", { id: key, value } as any);
}

export async function getValue<T = any>(key: string): Promise<T | null> {
  const row = await getRow<{ id: string; value: T }>("session", key);
  return row ? row.value : null;
}
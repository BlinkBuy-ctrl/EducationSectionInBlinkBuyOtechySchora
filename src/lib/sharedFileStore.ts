// Reads the file that public/sw.js stashed in IndexedDB when the OS share
// sheet handed SchoraHub a PDF (see the share_target entry in
// manifest.json). Plain IndexedDB, no library — this has to match exactly
// what sw.js writes, and sw.js is a classic (non-module) script that can't
// import this file, so both sides just agree on the same DB/store/key names.
const DB_NAME = "schorahub-shared-files";
const STORE_NAME = "shared";
const KEY = "pending";

export interface SharedFileRecord {
  file: Blob;
  name: string;
  type: string;
  sharedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Returns the pending shared file, if any, and clears it — a share only
// ever gets consumed once.
export async function takeSharedFile(): Promise<SharedFileRecord | null> {
  try {
    const db = await openDb();
    const record = await new Promise<SharedFileRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    if (record) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(KEY);
    }
    return record;
  } catch {
    return null;
  }
}

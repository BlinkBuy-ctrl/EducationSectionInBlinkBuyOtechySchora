// Tracks per-book reading position so the Browse tab can show a
// "Continue Reading" strip — the practical, buildable version of the
// "show me where I stopped" idea, since a real OS home-screen widget
// isn't reachable from a PWA (see chat).
//
// Stored entirely in localStorage, no backend involved — this is just a
// per-device convenience, same spirit as the anonymous identity system
// the rest of the app already uses.

export interface ReadingProgressEntry {
  resourceId: string;
  level: string;   // "MSCE" | "JCE" | "Primary" — which backend to refetch from
  title: string;
  category?: string;
  thumbnailUrl?: string;
  page: number;
  numPages: number;
  updatedAt: number;
}

const STORAGE_KEY = "otechy_reading_progress";
const EVENT_NAME = "otechy:reading-progress-updated";
const MAX_ENTRIES = 30; // keep localStorage from growing unbounded

function readAll(): Record<string, ReadingProgressEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, ReadingProgressEntry>) {
  try {
    // Trim to the most recently updated MAX_ENTRIES before saving.
    const trimmed = Object.values(all)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES);
    const next: Record<string, ReadingProgressEntry> = {};
    for (const e of trimmed) next[e.resourceId] = e;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage full or unavailable — reading still works, it just
    // won't resume next time. Not worth surfacing to the user.
  }
  try { window.dispatchEvent(new Event(EVENT_NAME)); } catch { /* SSR/no-window guard */ }
}

export function saveReadingProgress(entry: ReadingProgressEntry) {
  const all = readAll();
  all[entry.resourceId] = entry;
  writeAll(all);
}

export function getReadingProgress(resourceId: string): ReadingProgressEntry | undefined {
  return readAll()[resourceId];
}

// Only books that are actually in progress (not finished, not brand new).
export function listReadingProgress(limit = 10): ReadingProgressEntry[] {
  return Object.values(readAll())
    .filter(e => e.numPages > 1 && e.page < e.numPages)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, limit);
}

export function removeReadingProgress(resourceId: string) {
  const all = readAll();
  if (!(resourceId in all)) return;
  delete all[resourceId];
  writeAll(all);
}

// Lets education.tsx re-render its "Continue Reading" strip the moment a
// reader (in ResourceCard or ResourceDetailModal) saves/clears progress,
// without any prop-drilling of live state between those components.
export function onReadingProgressChange(callback: () => void): () => void {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}

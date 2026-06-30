/**
 * Safe localStorage wrapper.
 *
 * Raw `localStorage.getItem/setItem` calls throw in several real-world
 * conditions relevant to an installed Android PWA:
 *   - Storage access blocked by an MDM / enterprise policy
 *   - Browser running in a restricted/incognito-like WebView mode
 *   - Storage quota exceeded
 *   - Some OEM WebViews disabling storage for installed PWAs under
 *     low-storage conditions
 *
 * Any of these previously caused an unhandled exception during the
 * very first render (useAuth, useTheme, InstallPrompt, education.tsx
 * all called localStorage directly), which is indistinguishable from
 * "the app crashes immediately on launch" to the end user.
 *
 * This module centralizes every storage access behind a safe wrapper
 * with an in-memory fallback, so a storage failure degrades gracefully
 * (e.g. theme resets to default, anon id regenerates each session)
 * instead of crashing the app.
 */

const memoryFallback = new Map<string, string>();
let storageIsUsable: boolean | null = null;

function isLocalStorageUsable(): boolean {
  if (storageIsUsable !== null) return storageIsUsable;
  try {
    const testKey = "__schorahub_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    storageIsUsable = true;
  } catch {
    storageIsUsable = false;
  }
  return storageIsUsable;
}

export function safeGetItem(key: string): string | null {
  if (isLocalStorageUsable()) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      storageIsUsable = false;
    }
  }
  return memoryFallback.has(key) ? memoryFallback.get(key)! : null;
}

export function safeSetItem(key: string, value: string): void {
  if (isLocalStorageUsable()) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      storageIsUsable = false;
    }
  }
  memoryFallback.set(key, value);
}

export function safeRemoveItem(key: string): void {
  if (isLocalStorageUsable()) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      storageIsUsable = false;
    }
  }
  memoryFallback.delete(key);
}

/** Returns the real Storage object if usable, otherwise undefined (for libraries like Supabase that take a `storage` option). */
export function getUsableLocalStorage(): Storage | undefined {
  return isLocalStorageUsable() ? window.localStorage : undefined;
}

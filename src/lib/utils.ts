import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safe UUID generator.
 *
 * crypto.randomUUID() only exists on Chrome 92+ (Aug 2021), Firefox 95+,
 * Safari 15.4+. Older Android WebViews (common on budget devices) don't
 * have it — calling it directly throws TypeError and, if that happens
 * during initial render/mount, crashes the app to a blank screen before
 * the ErrorBoundary can render anything on top of the dark splash
 * background. ALWAYS use this helper instead of calling crypto.randomUUID()
 * directly anywhere in the app.
 */
export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    try {
      return (crypto as any).randomUUID() as string;
    } catch {
      // fall through to manual fallback below
    }
  }
  // RFC 4122 v4 fallback — no dependency on the crypto API at all
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Text size setting (per device).
 *
 * The chosen size is stored on the person's own phone only (localStorage),
 * and applied as a single CSS variable, --font-scale, on <html>. Changing it
 * is one property write, so there's no re-render, no network and no waiting:
 * every piece of text in the app resizes instantly.
 *
 * 1 = normal (nothing changes for people who never touch the slider).
 * The variable is read by the font sizes in tailwind.config.ts and by the
 * fixed-pixel size overrides at the bottom of src/index.css.
 */
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/storage";

export const FONT_SCALE_KEY = "otechyschora_font_scale";
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.25;
export const FONT_SCALE_STEP = 0.05;
export const FONT_SCALE_DEFAULT = 1;

export function clampFontScale(n: number): number {
  if (!isFinite(n)) return FONT_SCALE_DEFAULT;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(n * 100) / 100));
}

export function getFontScale(): number {
  const raw = safeGetItem(FONT_SCALE_KEY);
  if (raw === null) return FONT_SCALE_DEFAULT;
  return clampFontScale(parseFloat(raw));
}

export function applyFontScale(scale: number): void {
  document.documentElement.style.setProperty("--font-scale", String(scale));
}

export function saveFontScale(scale: number): void {
  safeSetItem(FONT_SCALE_KEY, String(scale));
}

export function resetFontScale(): number {
  safeRemoveItem(FONT_SCALE_KEY);
  applyFontScale(FONT_SCALE_DEFAULT);
  return FONT_SCALE_DEFAULT;
}

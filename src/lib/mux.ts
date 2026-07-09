// Tiny helper to keep Mux usage consistent everywhere it's used.
// We only ever store the Playback ID in Supabase — Mux Player takes it directly.

export function isLikelyPlaybackId(value: string): boolean {
  return value.trim().length > 5 && !value.includes(" ");
}

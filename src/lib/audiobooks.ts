/**
 * Shared helpers for the Audio Books feature.
 *
 * Every Audio Book component (AudioBookUploadModal, AudioBookCard,
 * AudioBookDetailModal, and the Browse-tab wiring in education.tsx) imports
 * from here — keeping table names, bucket names, and the upload/signed-URL
 * logic in exactly one place instead of duplicated across files.
 *
 * Mirrors the table/bucket names created in education_schema_v4_audiobooks.sql.
 */

import { bookshopSupabase } from "@/lib/bookshopSupabase";

// ── Backend constants — must match the schema file exactly ────────────────
export const TABLE_AUDIOBOOKS           = "otechy_audiobooks";
export const TABLE_AUDIOBOOK_PURCHASES  = "otechy_audiobook_purchases";
export const TABLE_AUDIOBOOK_BOOKMARKS  = "otechy_audiobook_bookmarks";
export const TABLE_AUDIOBOOK_REVIEWS    = "otechy_audiobook_reviews";

export const BUCKET_AUDIO   = "otechy-audio";   // private — signed URLs only
export const BUCKET_COVERS  = "otechy-images";  // existing public bucket, reused for cover art

export const AUDIOBOOK_CATEGORIES = ["Fiction", "Non-Fiction", "Educational", "Religious", "Other"] as const;
export type AudioBookCategory = typeof AUDIOBOOK_CATEGORIES[number];

export const MAX_AUDIO_FILE_SIZE = 300 * 1024 * 1024; // 300 MB — matches bucket file_size_limit

export const ACCEPTED_AUDIO_MIME =
  "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/aac,audio/webm,audio/flac," +
  ".mp3,.m4a,.wav,.ogg,.aac,.webm,.flac";

// ── Row shape — matches otechy_audiobooks columns ──────────────────────────
export interface AudioBook {
  id: string;
  uploader_id: string;
  title: string;
  description: string | null;
  author: string | null;
  narrator: string | null;
  category: AudioBookCategory;
  price: number;
  audio_url: string;        // storage path inside BUCKET_AUDIO — not a public URL
  audio_format: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  cover_url: string | null; // full public URL from BUCKET_COVERS
  play_count: number;
  download_count: number;
  avg_rating: number;
  review_count: number;
  created_at: string;
}

// ── Duration formatting: 45 -> "0:45", 185 -> "3:05", 3900 -> "1h 5m" ─────
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return "--:--";
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes?: number | null): string | null {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

/**
 * Reads an audio file's duration client-side, before upload, by loading it
 * into a throwaway <audio> element. Resolves 0 if metadata can't be read
 * (some formats/browsers) — never blocks the upload flow on this.
 */
export function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    const cleanup = () => URL.revokeObjectURL(url);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
      cleanup();
      resolve(d);
    };
    audio.onerror = () => { cleanup(); resolve(0); };
    audio.src = url;
  });
}

/**
 * Signed URL for playback/download — bucket is private, so every read goes
 * through this. Default 1hr expiry covers a full listening session.
 */
export async function getSignedAudioUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await bookshopSupabase.storage.from(BUCKET_AUDIO).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(error?.message ?? "Could not get audio URL");
  return data.signedUrl;
}

/**
 * Uploads an audio file to BUCKET_AUDIO with progress reporting, using the
 * same signed-upload-URL + XHR pattern already used for PDFs in
 * UploadModal.tsx, falling back to a direct SDK upload if signing fails.
 * Returns the storage path to store in otechy_audiobooks.audio_url.
 */
export async function uploadAudioWithProgress(
  file: File,
  uploaderId: string,
  onProgress: (pct: number) => void
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  const path = `${uploaderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await new Promise<void>((resolve, reject) => {
    bookshopSupabase.storage.from(BUCKET_AUDIO).createSignedUploadUrl(path).then(({ data, error }) => {
      if (error || !data) {
        // Fallback: direct SDK upload (no progress events, but still works)
        bookshopSupabase.storage.from(BUCKET_AUDIO).upload(path, file, {
          upsert: false,
          contentType: file.type || "audio/mpeg",
        }).then(({ error: e }) => (e ? reject(new Error(e.message)) : resolve()));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", data.signedUrl);
      xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });
  });

  return path;
}

/** Removes an uploaded audio file — used to clean up if the DB insert after upload fails. */
export async function removeAudioFile(path: string): Promise<void> {
  await bookshopSupabase.storage.from(BUCKET_AUDIO).remove([path]).catch(() => {});
}

/**
 * Share an audio book's detail page — native share sheet on mobile,
 * clipboard copy fallback everywhere else. Used by the share button on
 * AudioBookDetailModal.
 */
export async function shareAudioBook(book: Pick<AudioBook, "id" | "title">): Promise<"shared" | "copied" | "failed"> {
  const url = `${window.location.origin}${window.location.pathname}?audiobook=${book.id}`;
  const shareData = { title: book.title, text: `Listen to "${book.title}" on SchoraHub`, url };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch {
      // user cancelled the share sheet — not an error, don't fall through to clipboard
      return "failed";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

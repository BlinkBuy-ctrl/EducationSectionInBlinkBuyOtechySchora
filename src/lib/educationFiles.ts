// ============================================================
// lib/educationFiles.ts
// SchoraHub — Higher Education Files feature
//
// Reads: straight to the Jobs Supabase project (public RLS select
// policy on education_files).
//
// Uploads: the raw file goes DIRECTLY from the browser to the
// education-files storage bucket (public insert policy — see
// education_schema_v4.sql), bypassing the serverless function
// entirely so file size isn't capped by Vercel's ~4.5MB request
// limit. Only the resulting small JSON (title, urls, etc.) goes
// through api/manage-education-files.ts, which uses the service
// role to write the row — that's what keeps deletes/edits from
// being wide open even though uploads are.
//
// Cover images: extracted client-side for .docx/.xlsx/.pptx (they're
// zip files — pulling out the first embedded image needs no risky
// native dependencies) and used directly for image uploads. PDFs,
// legacy .doc/.xls/.ppt, and CSV/text fall back to a type icon in
// the UI — real PDF-page rendering needs native canvas libraries
// that are unreliable on Vercel serverless, so it's skipped on
// purpose rather than shipped half-working.
//
// Requires the `jszip` package: npm install jszip
// ============================================================

import JSZip from "jszip";
import { jobsSupabase } from "./jobsSupabase";

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────

export type EducationFileType = "pdf" | "doc" | "spreadsheet" | "presentation" | "image" | "other";

export interface EducationFile {
  id: string;
  university_id: string;
  program: string;
  category: string;
  file_url: string;
  cover_url: string | null;
  file_type: EducationFileType;
  title: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface EducationFileFilters {
  universityId?: string;
  program?: string;
  category?: string;
}

export interface UploadEducationFilePayload {
  file: File;
  university_id: string;
  program: string;
  category: string;
  title: string;
  uploaded_by?: string;
}

export const EDUCATION_FILE_CATEGORIES = [
  "Notes",
  "Past Papers",
  "Textbook",
  "Assignment",
  "Syllabus",
  "Other",
] as const;

// Accepted extensions, shown in the file picker and enforced client-side.
// The storage bucket also enforces this server-side via allowed_mime_types.
export const ACCEPTED_FILE_EXTENSIONS =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif";

const BUCKET = "education-files";
const API_ENDPOINT = "/api/manage-education-files";
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB — matches the bucket's file_size_limit

// ────────────────────────────────────────────────────────────
// FILE TYPE DETECTION
// ────────────────────────────────────────────────────────────

export function detectFileType(fileName: string): EducationFileType {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "spreadsheet";
  if (["ppt", "pptx"].includes(ext)) return "presentation";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  return "other";
}

function sanitizeForPath(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 60) || "file";
}

// ────────────────────────────────────────────────────────────
// COVER EXTRACTION (client-side, best-effort — never blocks upload)
// ────────────────────────────────────────────────────────────

async function extractCoverFromOfficeZip(file: File): Promise<Blob | null> {
  try {
    const zip = await JSZip.loadAsync(file);
    const mediaPaths = Object.keys(zip.files)
      .filter((p) => /^(word|xl|ppt)\/media\/image\d+\.(png|jpe?g|gif|bmp)$/i.test(p))
      .sort();
    if (mediaPaths.length === 0) return null;
    return await zip.files[mediaPaths[0]].async("blob");
  } catch {
    return null; // corrupt/unusual zip structure — just skip the cover
  }
}

async function buildCoverBlob(file: File, fileType: EducationFileType): Promise<Blob | null> {
  if (fileType === "image") return file;

  const ext = file.name.split(".").pop()?.toLowerCase();
  const isModernOfficeZip = ext === "docx" || ext === "xlsx" || ext === "pptx";
  if ((fileType === "doc" || fileType === "spreadsheet" || fileType === "presentation") && isModernOfficeZip) {
    return extractCoverFromOfficeZip(file);
  }

  // pdf, csv, legacy .doc/.xls/.ppt, other → no reliable extraction, icon fallback in UI
  return null;
}

// ────────────────────────────────────────────────────────────
// STORAGE — direct browser upload
// ────────────────────────────────────────────────────────────

async function uploadToStorage(blob: Blob, path: string, contentType: string): Promise<string> {
  const { error } = await jobsSupabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return jobsSupabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ────────────────────────────────────────────────────────────
// READ — list files (optionally filtered)
// ────────────────────────────────────────────────────────────

export async function getEducationFiles(filters: EducationFileFilters = {}): Promise<EducationFile[]> {
  let query = jobsSupabase.from("education_files").select("*").order("created_at", { ascending: false });

  if (filters.universityId) query = query.eq("university_id", filters.universityId);
  if (filters.program) query = query.eq("program", filters.program);
  if (filters.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch education files: ${error.message}`);

  return (data ?? []) as EducationFile[];
}

// ────────────────────────────────────────────────────────────
// WRITE — upload a file: bytes → storage directly, then a small
// metadata call to the API to create the row.
// ────────────────────────────────────────────────────────────

export async function uploadEducationFile(payload: UploadEducationFilePayload): Promise<EducationFile> {
  if (payload.file.size > MAX_FILE_BYTES) {
    const mb = (payload.file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`That file is ${mb}MB — the limit is 50MB.`);
  }

  const fileType = detectFileType(payload.file.name);
  const safeTitle = sanitizeForPath(payload.title);
  const timestamp = Date.now();
  const ext = payload.file.name.split(".").pop() ?? "bin";

  const filePath = `files/${safeTitle}-${timestamp}.${ext}`;
  const file_url = await uploadToStorage(payload.file, filePath, payload.file.type || "application/octet-stream");

  let cover_url: string | null = null;
  const coverBlob = await buildCoverBlob(payload.file, fileType);
  if (coverBlob) {
    try {
      const coverExt = fileType === "image" ? ext : "png";
      const coverPath = `covers/${safeTitle}-${timestamp}.${coverExt}`;
      cover_url = await uploadToStorage(
        coverBlob,
        coverPath,
        fileType === "image" ? payload.file.type || "image/jpeg" : "image/png"
      );
    } catch {
      cover_url = null; // cover is best-effort — never fail the whole upload over it
    }
  }

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      file: {
        university_id: payload.university_id,
        program: payload.program,
        category: payload.category,
        title: payload.title,
        uploaded_by: payload.uploaded_by,
        file_url,
        cover_url,
        file_type: fileType,
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");

  return json.file as EducationFile;
}

// ────────────────────────────────────────────────────────────
// DELETE — remove a file (row + underlying storage objects)
// ────────────────────────────────────────────────────────────

export async function deleteEducationFile(fileId: string): Promise<void> {
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", fileId }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Delete failed");
}

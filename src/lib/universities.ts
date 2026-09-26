// ============================================================
// lib/universities.ts
// SchoraHub — Higher Education Feature
//
// Reads go straight to the Higher Education Supabase project
// (higherEducationSupabase.ts) — public RLS select policy.
//
// Writes (create/update/delete university or link) go through
// api/manage-higher-education.ts instead of hitting the table
// directly. That endpoint checks the caller's session against your
// MAIN project's `profiles.is_admin`, then uses the Higher
// Education project's SERVICE ROLE key to actually write — same
// split-project admin pattern as Jobs (see JobsAdmin.tsx / manage-jobs.ts).
// ============================================================

import { supabase } from "./supabase";
import { higherEdSupabase } from "./higherEducationSupabase";

// ────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────

export interface University {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
  created_by: string | null;
}

export interface UniversityLink {
  id: string;
  university_id: string;
  platform_type: string;
  url: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface CreateUniversityPayload {
  name: string;
  logoFile: File | null;
}

export interface CreateLinkPayload {
  university_id: string;
  platform_type: string;
  url: string;
  description: string;
  sort_order?: number;
}

const API_ENDPOINT = "/api/manage-higher-education";

// ────────────────────────────────────────────────────────────
// Admin API helper — attaches the caller's own main-project
// session token so the server can verify is_admin.
// ────────────────────────────────────────────────────────────

async function callAdminApi<T>(body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as T;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the logo file"));
    reader.readAsDataURL(file);
  });
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — create
// Logo (if any) goes up as base64; the server uploads it with the
// service role and inserts the row.
// ────────────────────────────────────────────────────────────

export async function createUniversity(
  payload: CreateUniversityPayload
): Promise<University> {
  const logoBase64 = payload.logoFile ? await fileToBase64(payload.logoFile) : null;

  const { university } = await callAdminApi<{ university: University }>({
    action: "create_university",
    name: payload.name.trim(),
    logoBase64,
    logoFileName: payload.logoFile?.name ?? null,
  });

  return university;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — fetch all (public grid, A→Z)
// ────────────────────────────────────────────────────────────

export async function getUniversities(): Promise<University[]> {
  const { data, error } = await higherEdSupabase
    .from("universities")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to fetch universities: ${error.message}`);

  return (data ?? []) as University[];
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — fetch one by id (for detail view)
// ────────────────────────────────────────────────────────────

export async function getUniversityById(id: string): Promise<University> {
  const { data, error } = await higherEdSupabase
    .from("universities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch university: ${error.message}`);

  return data as University;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — update name or logo (admin only, via API)
// ────────────────────────────────────────────────────────────

export async function updateUniversity(
  id: string,
  updates: { name?: string; logo_url?: string }
): Promise<University> {
  const { university } = await callAdminApi<{ university: University }>({
    action: "update_university",
    id,
    updates,
  });

  return university;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — delete (cascades to all its links, admin only)
// ────────────────────────────────────────────────────────────

export async function deleteUniversity(id: string): Promise<void> {
  await callAdminApi({ action: "delete_university", id });
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — create a link inside a university (admin only)
// ────────────────────────────────────────────────────────────

export async function createUniversityLink(
  payload: CreateLinkPayload
): Promise<UniversityLink> {
  const { link } = await callAdminApi<{ link: UniversityLink }>({
    action: "create_link",
    university_id: payload.university_id,
    platform_type: payload.platform_type.trim(),
    url: payload.url.trim(),
    description: payload.description.trim(),
    sort_order: payload.sort_order ?? 0,
  });

  return link;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — fetch all links for one university
// Ordered by sort_order then created_at
// ────────────────────────────────────────────────────────────

export async function getUniversityLinks(
  universityId: string
): Promise<UniversityLink[]> {
  const { data, error } = await higherEdSupabase
    .from("university_links")
    .select("*")
    .eq("university_id", universityId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch links: ${error.message}`);

  return (data ?? []) as UniversityLink[];
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — delete a single link (admin only)
// ────────────────────────────────────────────────────────────

export async function deleteUniversityLink(linkId: string): Promise<void> {
  await callAdminApi({ action: "delete_link", id: linkId });
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — update a link (admin only)
// ────────────────────────────────────────────────────────────

export async function updateUniversityLink(
  linkId: string,
  updates: Partial<Pick<UniversityLink, "platform_type" | "url" | "description" | "sort_order">>
): Promise<UniversityLink> {
  const { link } = await callAdminApi<{ link: UniversityLink }>({
    action: "update_link",
    id: linkId,
    updates,
  });

  return link;
}

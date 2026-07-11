// ============================================================
// lib/universities.ts
// SchoraHub — Higher Education Feature
// All Supabase calls for universities and university_links.
// ============================================================

import { supabase } from "./supabase";

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

// ────────────────────────────────────────────────────────────
// STORAGE — upload a university logo
// Returns the public URL string, or null if no file provided.
// ────────────────────────────────────────────────────────────

export async function uploadUniversityLogo(
  file: File,
  universityName: string
): Promise<string> {
  // Sanitize name for use as a filename
  const safeName = universityName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const ext = file.name.split(".").pop();
  const fileName = `${safeName}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("university-logos")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`Logo upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("university-logos")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — create
// Uploads logo first (if provided), then inserts the row.
// ────────────────────────────────────────────────────────────

export async function createUniversity(
  payload: CreateUniversityPayload
): Promise<University> {
  let logo_url: string | null = null;

  if (payload.logoFile) {
    logo_url = await uploadUniversityLogo(payload.logoFile, payload.name);
  }

  const { data, error } = await supabase
    .from("universities")
    .insert([
      {
        name: payload.name.trim(),
        logo_url,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create university: ${error.message}`);

  return data as University;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — fetch all (public grid, A→Z)
// ────────────────────────────────────────────────────────────

export async function getUniversities(): Promise<University[]> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from("universities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch university: ${error.message}`);

  return data as University;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — update name or logo (admin only via frontend)
// ────────────────────────────────────────────────────────────

export async function updateUniversity(
  id: string,
  updates: { name?: string; logo_url?: string }
): Promise<University> {
  const { data, error } = await supabase
    .from("universities")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update university: ${error.message}`);

  return data as University;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITIES — delete (cascades to all its links)
// ────────────────────────────────────────────────────────────

export async function deleteUniversity(id: string): Promise<void> {
  const { error } = await supabase
    .from("universities")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete university: ${error.message}`);
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — create a link inside a university
// ────────────────────────────────────────────────────────────

export async function createUniversityLink(
  payload: CreateLinkPayload
): Promise<UniversityLink> {
  const { data, error } = await supabase
    .from("university_links")
    .insert([
      {
        university_id: payload.university_id,
        platform_type: payload.platform_type.trim(),
        url: payload.url.trim(),
        description: payload.description.trim(),
        sort_order: payload.sort_order ?? 0,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create link: ${error.message}`);

  return data as UniversityLink;
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — fetch all links for one university
// Ordered by sort_order then created_at
// ────────────────────────────────────────────────────────────

export async function getUniversityLinks(
  universityId: string
): Promise<UniversityLink[]> {
  const { data, error } = await supabase
    .from("university_links")
    .select("*")
    .eq("university_id", universityId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch links: ${error.message}`);

  return (data ?? []) as UniversityLink[];
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — delete a single link
// ────────────────────────────────────────────────────────────

export async function deleteUniversityLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from("university_links")
    .delete()
    .eq("id", linkId);

  if (error) throw new Error(`Failed to delete link: ${error.message}`);
}

// ────────────────────────────────────────────────────────────
// UNIVERSITY LINKS — update a link (edit url, description etc)
// ────────────────────────────────────────────────────────────

export async function updateUniversityLink(
  linkId: string,
  updates: Partial<Pick<UniversityLink, "platform_type" | "url" | "description" | "sort_order">>
): Promise<UniversityLink> {
  const { data, error } = await supabase
    .from("university_links")
    .update(updates)
    .eq("id", linkId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update link: ${error.message}`);

  return data as UniversityLink;
}

// Real, server-verified admin authentication.
//
// This is intentionally separate from the normal anonymous user system in
// useAuth.ts / hooks/useAuth.ts. Regular visitors never touch this file.
// It is only ever called from the hidden admin gesture flow.
//
// Why this is safe: the actual password check happens on Supabase's servers
// (supabase.auth.signInWithPassword), not in this file. This file only ever
// sees whether that check succeeded — it never contains the real password.
// The is_admin check afterwards is enforced again at the database level via
// Row Level Security (see education_schema_v4.sql), so even if someone
// tampered with this file in their own browser, the database itself would
// still refuse any admin-only write for a non-admin account.

import { supabase } from "@/lib/supabase";

export interface AdminProfile {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_admin: boolean;
}

export interface AdminSignInResult {
  success: boolean;
  error?: string;
  profile?: AdminProfile;
}

/**
 * Attempts to sign in as an admin.
 * 1. Verifies the email/password with Supabase Auth (server-side check).
 * 2. Looks up the matching profile and confirms is_admin = true.
 * 3. If the account is valid but NOT an admin, immediately signs it back out —
 *    so a regular Supabase account can never sit "half logged in" here.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminSignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { success: false, error: "Incorrect email or password." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,name,email,role,is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.is_admin) {
    // Valid Supabase account, but not an admin — don't leave a session lying around.
    await supabase.auth.signOut();
    return { success: false, error: "This account does not have admin access." };
  }

  return { success: true, profile: profile as AdminProfile };
}

/** Signs the admin out. Always call this when the Admin Panel is closed. */
export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Checks whether there's currently a valid, verified admin session.
 * Useful if the Admin Panel ever needs to re-check itself (e.g. after a
 * background tab refocus) without asking the person to log in again.
 */
export async function getActiveAdminProfile(): Promise<AdminProfile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,name,email,role,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_admin) return null;
  return profile as AdminProfile;
}

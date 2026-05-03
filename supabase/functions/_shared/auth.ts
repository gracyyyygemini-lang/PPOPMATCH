// Token verification for PopMatch edge functions.
// All users authenticate via Supabase email OTP — no Firebase.
// The Supabase session access token is verified via adminClient.auth.getUser().

import { adminClient } from "./supabase-admin.ts";

export interface AuthClaims {
  uid:   string; // Supabase auth user UUID — equals users.id directly
  email: string;
}

export async function verifyToken(
  authHeader: string | null
): Promise<AuthClaims> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }
  const token = authHeader.slice(7);

  const { data: { user }, error } = await adminClient.auth.getUser(token);

  if (error || !user?.email) {
    throw new Error("Invalid or expired session — please sign in again");
  }
  if (!user.email.endsWith(".edu")) {
    throw new Error("Only .edu email addresses are allowed");
  }

  return { uid: user.id, email: user.email };
}

// Service-role Supabase client — only used inside Edge Functions.
// SUPABASE_SERVICE_ROLE_KEY is auto-injected by the Supabase runtime.
// Never expose this key to the frontend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const adminClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  // Supabase auto-injects SUPABASE_SERVICE_ROLE_KEY; SERVICE_ROLE_KEY is the
  // legacy manual-secret name — try both so either config works.
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

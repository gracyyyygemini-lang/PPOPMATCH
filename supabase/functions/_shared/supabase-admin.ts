// Service-role Supabase client — only used inside Edge Functions.
// Never expose SERVICE_ROLE_KEY to the frontend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const adminClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

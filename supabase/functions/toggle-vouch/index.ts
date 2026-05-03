// POST /functions/v1/toggle-vouch
// Adds or removes a vouch. Only existing friends can vouch.
// Body: { targetEmail: string, message?: string }
// Requires: Authorization: Bearer <supabase-session-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyToken } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyToken(req.headers.get("Authorization"));

    const { targetEmail, message = "" } = await req.json();
    if (!targetEmail) return corsError("targetEmail is required");

    const { data: them } = await adminClient
      .from("users").select("id").eq("email", targetEmail.toLowerCase()).single();

    if (!them) return corsError("Target user not found", 404);

    const myId = claims.uid;

    // Must be friends to vouch
    const { data: friendship } = await adminClient
      .from("friendships")
      .select("user_id")
      .eq("user_id", myId)
      .eq("friend_id", them.id)
      .maybeSingle();

    if (!friendship) return corsError("You can only vouch for friends", 403);

    // Toggle: if vouch exists → remove; if not → add
    const { data: existingVouch } = await adminClient
      .from("vouches")
      .select("voucher_id")
      .eq("voucher_id", myId)
      .eq("vouchee_id", them.id)
      .maybeSingle();

    if (existingVouch) {
      await adminClient
        .from("vouches")
        .delete()
        .eq("voucher_id", myId)
        .eq("vouchee_id", them.id);
      return corsResponse({ vouched: false });
    } else {
      await adminClient.from("vouches").insert({
        voucher_id: myId,
        vouchee_id: them.id,
        message:    message.trim(),
      });
      return corsResponse({ vouched: true });
    }
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 :
                   msg.includes("friends") ? 403 : 400;
    return corsError(msg, status);
  }
});

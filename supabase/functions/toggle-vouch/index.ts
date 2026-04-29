// POST /functions/v1/toggle-vouch
// Adds or removes a vouch. Only existing friends can vouch.
// Body: { targetEmail: string, message?: string }
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const { targetEmail, message = "" } = await req.json();
    if (!targetEmail) return corsError("targetEmail is required");

    const [{ data: me }, { data: them }] = await Promise.all([
      adminClient.from("users").select("id").eq("firebase_uid", claims.uid).single(),
      adminClient.from("users").select("id").eq("email", targetEmail.toLowerCase()).single(),
    ]);

    if (!me)   return corsError("User not found", 404);
    if (!them) return corsError("Target user not found", 404);

    // Must be friends to vouch
    const { data: friendship } = await adminClient
      .from("friendships")
      .select("user_id")
      .eq("user_id", me.id)
      .eq("friend_id", them.id)
      .maybeSingle();

    if (!friendship) return corsError("You can only vouch for friends", 403);

    // Toggle: if vouch exists → remove; if not → add
    const { data: existingVouch } = await adminClient
      .from("vouches")
      .select("voucher_id")
      .eq("voucher_id", me.id)
      .eq("vouchee_id", them.id)
      .maybeSingle();

    if (existingVouch) {
      await adminClient
        .from("vouches")
        .delete()
        .eq("voucher_id", me.id)
        .eq("vouchee_id", them.id);
      return corsResponse({ vouched: false });
    } else {
      await adminClient.from("vouches").insert({
        voucher_id: me.id,
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

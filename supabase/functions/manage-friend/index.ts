// POST   /functions/v1/manage-friend  { action: "add",    targetEmail }
// POST   /functions/v1/manage-friend  { action: "remove", targetEmail }
// Friendship is always bidirectional (A↔B = two rows).
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const { action, targetEmail } = await req.json();
    if (!action || !targetEmail) return corsError("action and targetEmail are required");
    if (!["add", "remove"].includes(action)) return corsError("action must be 'add' or 'remove'");

    if (targetEmail.toLowerCase() === claims.email.toLowerCase()) {
      return corsError("Cannot friend yourself");
    }

    const [{ data: me }, { data: them }] = await Promise.all([
      adminClient.from("users").select("id").eq("firebase_uid", claims.uid).single(),
      adminClient.from("users").select("id").eq("email", targetEmail.toLowerCase()).single(),
    ]);

    if (!me)   return corsError("Your account not found — complete onboarding first", 404);
    if (!them) return corsError("That email is not registered on PopMatch yet", 404);

    if (action === "add") {
      await adminClient.from("friendships").upsert([
        { user_id: me.id, friend_id: them.id },
        { user_id: them.id, friend_id: me.id },
      ], { onConflict: "user_id,friend_id", ignoreDuplicates: true });
    } else {
      await adminClient.from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${me.id},friend_id.eq.${them.id}),` +
          `and(user_id.eq.${them.id},friend_id.eq.${me.id})`
        );
    }

    return corsResponse({ success: true });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

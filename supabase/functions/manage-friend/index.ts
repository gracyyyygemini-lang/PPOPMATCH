// POST   /functions/v1/manage-friend  { action: "add",    targetEmail }
// POST   /functions/v1/manage-friend  { action: "remove", targetEmail }
// Friendship is always bidirectional (A↔B = two rows).
// Requires: Authorization: Bearer <supabase-session-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyToken } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyToken(req.headers.get("Authorization"));

    const { action, targetEmail } = await req.json();
    if (!action || !targetEmail) return corsError("action and targetEmail are required");
    if (!["add", "remove"].includes(action)) return corsError("action must be 'add' or 'remove'");

    if (targetEmail.toLowerCase() === claims.email.toLowerCase()) {
      return corsError("Cannot friend yourself");
    }

    const { data: them } = await adminClient
      .from("users").select("id").eq("email", targetEmail.toLowerCase()).single();

    if (!them) return corsError("That email is not registered on PopMatch yet", 404);

    const myId = claims.uid;

    if (action === "add") {
      await adminClient.from("friendships").upsert([
        { user_id: myId,    friend_id: them.id },
        { user_id: them.id, friend_id: myId    },
      ], { onConflict: "user_id,friend_id", ignoreDuplicates: true });
    } else {
      await adminClient.from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${myId},friend_id.eq.${them.id}),` +
          `and(user_id.eq.${them.id},friend_id.eq.${myId})`
        );
    }

    return corsResponse({ success: true });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

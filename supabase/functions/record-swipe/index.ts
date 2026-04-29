// POST /functions/v1/record-swipe
// Records a matchmaker swipe (like or pass) and checks for a mutual match.
// Body: { targetFirebaseUid: string, liked: boolean, score: number }
// Returns: { matched: boolean }
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const { targetFirebaseUid, liked, score = 0 } = await req.json();
    if (!targetFirebaseUid) return corsError("targetFirebaseUid is required");
    if (typeof liked !== "boolean") return corsError("liked must be boolean");

    const [{ data: me }, { data: them }] = await Promise.all([
      adminClient.from("users").select("id").eq("firebase_uid", claims.uid).single(),
      adminClient.from("users").select("id").eq("firebase_uid", targetFirebaseUid).single(),
    ]);

    if (!me)   return corsError("User not found", 404);
    if (!them) return corsError("Target user not found", 404);
    if (me.id === them.id) return corsError("Cannot swipe on yourself");

    // Upsert the swipe
    await adminClient.from("matches").upsert({
      swiper_id: me.id,
      swipee_id: them.id,
      liked,
      score,
    }, { onConflict: "swiper_id,swipee_id" });

    // Check for mutual match (both liked each other)
    let matched = false;
    if (liked) {
      const { data: reverse } = await adminClient
        .from("matches")
        .select("liked")
        .eq("swiper_id", them.id)
        .eq("swipee_id", me.id)
        .maybeSingle();

      matched = reverse?.liked === true;

      if (matched) {
        await adminClient.rpc("increment_stat", { stat_key: "total_matches" });
      }
    }

    return corsResponse({ matched });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

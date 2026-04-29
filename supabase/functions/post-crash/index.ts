// POST /functions/v1/post-crash
// Creates a Crash & Cash post.
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const { data: me } = await adminClient
      .from("users")
      .select("id")
      .eq("firebase_uid", claims.uid)
      .single();

    if (!me) return corsError("User not found — complete onboarding first", 404);

    const {
      vibe, story, imageUrl = "", dates = "", targetDate,
      zone = "campustown", currency, currencyLabel = "", approxLocation,
    } = await req.json();

    if (!vibe)       return corsError("vibe is required");
    if (!story?.trim()) return corsError("story is required");
    if (!currency)   return corsError("currency is required");
    if (!targetDate) return corsError("targetDate is required");

    const { data: post, error: postErr } = await adminClient
      .from("crash_posts")
      .insert({
        user_id:        me.id,
        vibe,
        story:          story.trim(),
        image_url:      imageUrl,
        dates,
        target_date:    targetDate,
        zone,
        currency,
        currency_label: currencyLabel,
        approx_location: approxLocation ?? null,
        status:         "active",
      })
      .select("id")
      .single();

    if (postErr) throw postErr;

    return corsResponse({ id: post.id });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

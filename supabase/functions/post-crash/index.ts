// POST /functions/v1/post-crash
// Creates a Crash & Cash post.
// Requires: Authorization: Bearer <supabase-session-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyToken } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyToken(req.headers.get("Authorization"));

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
        user_id:        claims.uid,
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

// POST /functions/v1/start-conversation
// Finds an existing conversation or creates a new one.
// Body: { targetSupabaseId, listingRef, listingBuilding, listingPrice, listingUnitType?, source? }
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
      targetSupabaseId, listingRef = "", listingBuilding = "",
      listingPrice = 0, listingUnitType, source,
    } = await req.json();

    if (!targetSupabaseId) return corsError("targetSupabaseId is required");

    if (claims.uid === targetSupabaseId) return corsError("Cannot message yourself");

    const myId = claims.uid;
    const theirId = targetSupabaseId;

    // Check if conversation already exists (order-independent participant check)
    const { data: existing } = await adminClient
      .from("conversations")
      .select("id")
      .or(
        `and(participant1_id.eq.${myId},participant2_id.eq.${theirId}),` +
        `and(participant1_id.eq.${theirId},participant2_id.eq.${myId})`
      )
      .eq("listing_ref", listingRef)
      .maybeSingle();

    if (existing) return corsResponse({ id: existing.id });

    const { data: convo, error: convoErr } = await adminClient
      .from("conversations")
      .insert({
        participant1_id:  myId,
        participant2_id:  theirId,
        listing_ref:      listingRef,
        listing_building: listingBuilding,
        listing_price:    listingPrice,
        listing_unit_type: listingUnitType ?? null,
        source:           source ?? null,
      })
      .select("id")
      .single();

    if (convoErr) throw convoErr;

    return corsResponse({ id: convo.id });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

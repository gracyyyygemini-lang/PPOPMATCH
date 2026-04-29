// POST /functions/v1/start-conversation
// Finds an existing conversation or creates a new one.
// Body: { targetFirebaseUid, listingRef, listingBuilding, listingPrice, listingUnitType?, source? }
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const {
      targetSupabaseId, listingRef = "", listingBuilding = "",
      listingPrice = 0, listingUnitType, source,
    } = await req.json();

    if (!targetSupabaseId) return corsError("targetSupabaseId is required");

    // Resolve caller from Firebase JWT; target is already a Supabase UUID
    const [{ data: me }, { data: them }] = await Promise.all([
      adminClient.from("users").select("id").eq("firebase_uid", claims.uid).single(),
      adminClient.from("users").select("id").eq("id", targetSupabaseId).single(),
    ]);

    if (!me)   return corsError("Your account not found — complete onboarding first", 404);
    if (!them) return corsError("Target user not found", 404);
    if (me.id === them.id) return corsError("Cannot message yourself");

    // Check if conversation already exists (order-independent participant check)
    const { data: existing } = await adminClient
      .from("conversations")
      .select("id")
      .or(
        `and(participant1_id.eq.${me.id},participant2_id.eq.${them.id}),` +
        `and(participant1_id.eq.${them.id},participant2_id.eq.${me.id})`
      )
      .eq("listing_ref", listingRef)
      .maybeSingle();

    if (existing) return corsResponse({ id: existing.id });

    const { data: convo, error: convoErr } = await adminClient
      .from("conversations")
      .insert({
        participant1_id:  me.id,
        participant2_id:  them.id,
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

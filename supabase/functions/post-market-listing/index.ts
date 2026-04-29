// POST /functions/v1/post-market-listing
// Creates a new Illini Market listing.
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const { data: userRow } = await adminClient
      .from("users")
      .select("id")
      .eq("firebase_uid", claims.uid)
      .single();

    if (!userRow) return corsError("User not found — complete onboarding first", 404);

    const {
      title, description = "", price = 0, category = "other",
      condition = "good", pickupLocation = "",
      acceptsVenmo = false, acceptsCash = true, acceptsZelle = false,
      images = [],
    } = await req.json();

    if (!title?.trim()) return corsError("title is required");
    if (price < 0)      return corsError("price must be ≥ 0");

    const VALID_CATS = ["textbooks","tech","furniture","bikes","clothing","other"];
    const VALID_CONDS = ["new","like_new","good","fair","for_parts"];
    if (!VALID_CATS.includes(category))  return corsError(`Invalid category: ${category}`);
    if (!VALID_CONDS.includes(condition)) return corsError(`Invalid condition: ${condition}`);

    const { data: listing, error } = await adminClient
      .from("marketplace_listings")
      .insert({
        user_id:         userRow.id,
        title:           title.trim(),
        description:     description.trim(),
        price,
        category,
        condition,
        pickup_location: pickupLocation.trim(),
        accepts_venmo:   acceptsVenmo,
        accepts_cash:    acceptsCash,
        accepts_zelle:   acceptsZelle,
        images,
      })
      .select("id")
      .single();

    if (error) throw error;
    return corsResponse({ id: listing.id });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

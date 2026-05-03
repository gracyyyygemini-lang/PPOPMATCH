// POST /functions/v1/mark-sold
// Marks a market listing as sold. Only the listing owner can call this.
// Body: { listingId: string }
// Requires: Authorization: Bearer <supabase-session-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyToken } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyToken(req.headers.get("Authorization"));

    const { listingId } = await req.json();
    if (!listingId) return corsError("listingId is required");

    const { data: listing } = await adminClient
      .from("marketplace_listings")
      .select("id, user_id, is_sold")
      .eq("id", listingId)
      .single();

    if (!listing)           return corsError("Listing not found", 404);
    if (listing.is_sold)    return corsError("Listing is already marked as sold");
    if (listing.user_id !== claims.uid) return corsError("Forbidden — not your listing", 403);

    await adminClient
      .from("marketplace_listings")
      .update({ is_sold: true })
      .eq("id", listingId);

    return corsResponse({ success: true });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 :
                   msg.includes("Forbidden") ? 403 : 400;
    return corsError(msg, status);
  }
});

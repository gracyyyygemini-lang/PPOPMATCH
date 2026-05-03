// POST /functions/v1/mark-leased
// Marks a listing as leased. Only the listing owner can call this.
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

    // Verify ownership before marking leased
    const { data: listing } = await adminClient
      .from("listings")
      .select("id, user_id, is_leased")
      .eq("id", listingId)
      .single();

    if (!listing)          return corsError("Listing not found", 404);
    if (listing.is_leased) return corsError("Listing is already marked as leased");
    if (listing.user_id !== claims.uid) return corsError("Forbidden — not your listing", 403);

    await adminClient
      .from("listings")
      .update({ is_leased: true })
      .eq("id", listingId);

    await adminClient.rpc("increment_stat", { stat_key: "successful_subleases" });

    return corsResponse({ success: true });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 :
                   msg.includes("Forbidden") ? 403 : 400;
    return corsError(msg, status);
  }
});

// POST /functions/v1/submit-feedback
// Submits app feedback. Token is optional — allows anonymous feedback.
// Body: { rating: "rescue"|"meh"|"love", issueCategory?, issueDetail? }
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { rating, issueCategory = "", issueDetail = "" } = await req.json();

    if (!["rescue", "meh", "love"].includes(rating)) {
      return corsError("rating must be rescue, meh, or love");
    }

    // Try to identify caller — feedback is allowed anonymously
    let userId: string | null = null;
    let userEmail = "anonymous";

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const claims = await verifyFirebaseToken(authHeader);
        userEmail = claims.email;
        const { data: me } = await adminClient
          .from("users")
          .select("id")
          .eq("firebase_uid", claims.uid)
          .single();
        if (me) userId = me.id;
      } catch {
        // unauthenticated feedback — still accepted
      }
    }

    await adminClient.from("feedback").insert({
      user_id:        userId,
      user_email:     userEmail,
      rating,
      issue_category: issueCategory,
      issue_detail:   issueDetail,
    });

    return corsResponse({ success: true });
  } catch (err) {
    const msg = msgOf(err);
    return corsError(msg, 400);
  }
});

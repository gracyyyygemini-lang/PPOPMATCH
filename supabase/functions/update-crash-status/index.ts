// POST /functions/v1/update-crash-status
// Marks a crash post as completed. Only the post owner can call this.
// Body: { crashPostId: string, status: "active" | "completed" }
// Requires: Authorization: Bearer <supabase-session-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyToken } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyToken(req.headers.get("Authorization"));

    const { crashPostId, status } = await req.json();
    if (!crashPostId) return corsError("crashPostId is required");
    if (!["active", "completed"].includes(status)) {
      return corsError("status must be 'active' or 'completed'");
    }

    const { data: post } = await adminClient
      .from("crash_posts")
      .select("id, user_id")
      .eq("id", crashPostId)
      .single();

    if (!post)                      return corsError("Post not found", 404);
    if (post.user_id !== claims.uid) return corsError("Forbidden — not your post", 403);

    await adminClient
      .from("crash_posts")
      .update({ status })
      .eq("id", crashPostId);

    return corsResponse({ success: true });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 :
                   msg.includes("Forbidden") ? 403 : 400;
    return corsError(msg, status);
  }
});

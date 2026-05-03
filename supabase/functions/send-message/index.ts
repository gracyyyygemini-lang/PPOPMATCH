// POST /functions/v1/send-message
// Sends a message in a conversation. Caller must be a participant.
// Body: { conversationId: string, content: string }
// Requires: Authorization: Bearer <supabase-session-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyToken } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyToken(req.headers.get("Authorization"));

    const { conversationId, content } = await req.json();
    if (!conversationId) return corsError("conversationId is required");
    if (!content?.trim()) return corsError("content cannot be empty");

    // Verify caller is a participant
    const { data: convo } = await adminClient
      .from("conversations")
      .select("id, participant1_id, participant2_id")
      .eq("id", conversationId)
      .single();

    if (!convo) return corsError("Conversation not found", 404);

    const isParticipant =
      convo.participant1_id === claims.uid || convo.participant2_id === claims.uid;
    if (!isParticipant) return corsError("Forbidden — not a participant", 403);

    const { data: msg, error: msgErr } = await adminClient
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id:       claims.uid,
        content:         content.trim(),
      })
      .select("id, conversation_id, sender_id, content, created_at")
      .single();

    if (msgErr) throw msgErr;

    return corsResponse(msg);
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 :
                   msg.includes("Forbidden") ? 403 : 400;
    return corsError(msg, status);
  }
});

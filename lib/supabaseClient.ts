/**
 * PopMatch — Supabase client helper
 *
 * Auth: Supabase email OTP only (no Firebase).
 * Session is persisted to AsyncStorage so users stay signed in across restarts.
 *
 * Security model:
 *   SUPABASE_ANON_KEY  — safe to expose; used for reads + real-time only.
 *   SUPABASE_SERVICE_ROLE_KEY — NEVER imported here; lives in Edge Functions only.
 *   All writes flow through Edge Functions which verify the Supabase session token.
 *
 * Usage:
 *   import { supabase, fn, rt } from "@/lib/supabaseClient";
 *   const { data } = await supabase.from("listings").select("...");
 *   await fn.postListing(token, payload);
 *   const unsub = rt.onNewMessage(convoId, handler);
 */

import { createClient, RealtimeChannel } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Public / anon client ─────────────────────────────────────
// Hardcoded for debugging — swap back to process.env once env vars are confirmed working.
const SUPABASE_URL  = "https://zjyzjbrotvyxcwlizwaa.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXpqYnJvdHZ5eGN3bGl6d2FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNzMzNTQsImV4cCI6MjA4NzY0OTM1NH0.7AcLEIICrdatVFRmc99qwWfg_eqQx6khponESAllGV4";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:            AsyncStorage,
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ─── Edge Function base URL ───────────────────────────────────
const EDGE_BASE = `${SUPABASE_URL}/functions/v1`;

async function callEdge<T = unknown>(
  path: string,
  token: string,
  body?: unknown,
  method = "POST"
): Promise<T> {
  const res = await fetch(`${EDGE_BASE}/${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: `Edge function ${path} returned non-JSON (${res.status})` }));
  if (!res.ok) {
    console.error("Edge function error:", JSON.stringify(data));
    throw new Error(JSON.stringify(data));
  }
  return data as T;
}

// ─── Typed Edge Function helpers ──────────────────────────────
export const fn = {
  /** Creates or updates the full user profile after sign-in. */
  upsertUser(token: string, profile: UpsertUserPayload) {
    return callEdge<{ id: string; email: string }>("upsert-user", token, profile);
  },

  /** Posts a new sublease or roommate listing. Returns { id }. */
  postListing(token: string, listing: PostListingPayload) {
    return callEdge<{ id: string }>("post-listing", token, listing);
  },

  /** Marks the caller's listing as leased. */
  markLeased(token: string, listingId: string) {
    return callEdge<{ success: boolean }>("mark-leased", token, { listingId });
  },

  /**
   * Finds an existing conversation or creates a new one.
   * Returns { id: conversationId }.
   */
  startConversation(token: string, payload: StartConversationPayload) {
    return callEdge<{ id: string }>("start-conversation", token, payload);
  },

  /** Sends a message in a conversation. Returns the saved message row. */
  sendMessage(token: string, conversationId: string, content: string) {
    return callEdge<DBMessage>("send-message", token, { conversationId, content });
  },

  /** Adds or removes a friendship (bidirectional). */
  manageFriend(token: string, action: "add" | "remove", targetEmail: string) {
    return callEdge<{ success: boolean }>("manage-friend", token, { action, targetEmail });
  },

  /** Toggles vouch on a friend. Returns { vouched: boolean }. */
  toggleVouch(token: string, targetEmail: string, message?: string) {
    return callEdge<{ vouched: boolean }>("toggle-vouch", token, { targetEmail, message });
  },

  /** Posts a Crash & Cash listing. Returns { id }. */
  postCrash(token: string, payload: PostCrashPayload) {
    return callEdge<{ id: string }>("post-crash", token, payload);
  },

  /** Updates the status of a crash post to "active" or "completed". */
  updateCrashStatus(token: string, crashPostId: string, status: "active" | "completed") {
    return callEdge<{ success: boolean }>("update-crash-status", token, { crashPostId, status });
  },

  /** Records a matchmaker swipe. Returns { matched: boolean }. */
  recordSwipe(token: string, targetUserId: string, liked: boolean, score: number) {
    return callEdge<{ matched: boolean }>("record-swipe", token, { targetUserId, liked, score });
  },

  /** Submits in-app feedback. Token is optional (pass "" for anonymous). */
  submitFeedback(token: string, payload: FeedbackPayload) {
    return callEdge<{ success: boolean }>("submit-feedback", token, payload);
  },

  /** Posts a new Illini Market listing. Returns { id }. */
  postMarketListing(token: string, payload: PostMarketListingPayload) {
    return callEdge<{ id: string }>("post-market-listing", token, payload);
  },

  /** Marks an Illini Market listing as sold (owner only). */
  markSold(token: string, listingId: string) {
    return callEdge<{ success: boolean }>("mark-sold", token, { listingId });
  },
};

// ─── Real-time subscription helpers ───────────────────────────
export const rt = {
  /**
   * Subscribe to new messages in a conversation.
   * Returns an unsubscribe function.
   */
  onNewMessage(
    conversationId: string,
    handler: (msg: DBMessage) => void
  ): () => void {
    const channel: RealtimeChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => handler(payload.new as DBMessage)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  /**
   * Subscribe to new/updated listings (for live marketplace refresh).
   * Returns an unsubscribe function.
   */
  onListingChange(
    handler: (event: "INSERT" | "UPDATE" | "DELETE", listing: DBListing) => void
  ): () => void {
    const channel: RealtimeChannel = supabase
      .channel("listings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        (payload) => handler(
          payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          (payload.new ?? payload.old) as DBListing
        )
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  /**
   * Subscribe to new crash posts.
   * Returns an unsubscribe function.
   */
  onCrashChange(
    handler: (event: "INSERT" | "UPDATE", post: DBCrashPost) => void
  ): () => void {
    const channel: RealtimeChannel = supabase
      .channel("crash_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crash_posts" },
        (payload) => handler(
          payload.eventType as "INSERT" | "UPDATE",
          (payload.new ?? payload.old) as DBCrashPost
        )
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  /**
   * Subscribe to new/updated marketplace listings (Illini Market).
   * Returns an unsubscribe function.
   */
  onMarketListingChange(
    handler: (event: "INSERT" | "UPDATE" | "DELETE", listing: any) => void
  ): () => void {
    const channel: RealtimeChannel = supabase
      .channel("market_listings_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketplace_listings" },
        (payload) => handler(
          payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          (payload.new ?? payload.old)
        )
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  /**
   * Subscribe to new conversations for a Supabase user id.
   * Returns an unsubscribe function.
   */
  onConversationChange(
    supabaseUserId: string,
    handler: (convo: DBConversation) => void
  ): () => void {
    const channel: RealtimeChannel = supabase
      .channel(`convos:${supabaseUserId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "conversations",
          filter: `participant1_id=eq.${supabaseUserId}`,
        },
        (p) => handler(p.new as DBConversation)
      )
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "conversations",
          filter: `participant2_id=eq.${supabaseUserId}`,
        },
        (p) => handler(p.new as DBConversation)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};

// ─── Read helpers (anon key — no auth required) ───────────────
export const db = {
  /** Returns the user row by their Supabase auth UUID (users.id = auth.users.id). */
  async getUserByUid(uid: string) {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        user_organizations(organization),
        user_landlord_prefs(landlord),
        user_vibe_profiles(*,
          user_vibe_vices(vice),
          user_vibe_pets(pet)
        )
      `)
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  /** Fetches active listings with optional category filter. */
  async getListings(category?: string) {
    let q = supabase
      .from("listings")
      .select(`
        *,
        users!listings_user_id_fkey(name, avatar_color, email),
        listing_landlords(landlord),
        listing_break_types(break_type),
        listing_amenities(*),
        listing_images(url, display_order)
      `)
      .eq("is_leased", false)
      .order("created_at", { ascending: false });

    if (category && category !== "all") {
      q = q.eq("category", category);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  /** Fetches conversations for a Supabase user id (both sides). */
  async getConversations(supabaseUserId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        p1:users!conversations_participant1_id_fkey(id, name, avatar_color, email, profile_image_url),
        p2:users!conversations_participant2_id_fkey(id, name, avatar_color, email, profile_image_url)
      `)
      .or(`participant1_id.eq.${supabaseUserId},participant2_id.eq.${supabaseUserId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  /** Fetches messages for a conversation, oldest first. */
  async getMessages(conversationId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*, users!messages_sender_id_fkey(name, avatar_color)")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
  },

  /** Fetches all friendships for a Supabase user id. */
  async getFriends(supabaseUserId: string) {
    const { data, error } = await supabase
      .from("friendships")
      .select("friend_id, created_at, users!friendships_friend_id_fkey(id, name, email, avatar_color, college, major, user_organizations(organization))")
      .eq("user_id", supabaseUserId);

    if (error) throw error;
    return data ?? [];
  },

  /** Fetches vouches given by a Supabase user id. */
  async getVouchesGiven(supabaseUserId: string) {
    const { data, error } = await supabase
      .from("vouches")
      .select("vouchee_id, message")
      .eq("voucher_id", supabaseUserId);

    if (error) throw error;
    return data ?? [];
  },

  /** Fetches active crash posts. */
  async getCrashPosts(zone?: string) {
    let q = supabase
      .from("crash_posts")
      .select("*, users!crash_posts_user_id_fkey(name, avatar_color, email)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (zone && zone !== "all") q = q.eq("zone", zone);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  /** Server-computed trust info via Postgres function (avoids N+1 queries). */
  async getTrustInfo(viewerUid: string, targetEmail: string) {
    const { data, error } = await supabase.rpc("get_trust_info", {
      viewer_user_id: viewerUid,
      target_email:   targetEmail,
    });
    if (error) throw error;
    return data as TrustInfo;
  },

  /** Fetches the current stats row. */
  async getStats() {
    const { data, error } = await supabase.from("stats").select("key, value");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  },

  /** Fetches active Illini Market listings with seller info. */
  async getMarketListings(category?: string) {
    let q = supabase
      .from("marketplace_listings")
      .select("*, users!marketplace_listings_user_id_fkey(id, name, email, avatar_color)")
      .eq("is_sold", false)
      .order("created_at", { ascending: false });

    if (category && category !== "all") q = q.eq("category", category);

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  /**
   * Fetches all active users for the matchmaker, excluding the current user.
   * Ordered by most recently created so newer users surface first.
   */
  async getMatchUsers(excludeUid: string) {
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        user_organizations(organization),
        user_landlord_prefs(landlord),
        user_vibe_profiles(*,
          user_vibe_vices(vice),
          user_vibe_pets(pet)
        )
      `)
      .neq("id", excludeUid)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data ?? [];
  },

  /**
   * Fetches conversations with the most-recent message content/time for inbox preview.
   * Uses a lateral join via PostgREST's embedded ordering.
   */
  async getConversationsWithPreview(supabaseUserId: string) {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        *,
        p1:users!conversations_participant1_id_fkey(id, name, avatar_color, email, profile_image_url),
        p2:users!conversations_participant2_id_fkey(id, name, avatar_color, email, profile_image_url),
        messages(content, created_at)
      `)
      .or(`participant1_id.eq.${supabaseUserId},participant2_id.eq.${supabaseUserId}`)
      .order("created_at", { foreignTable: "messages", ascending: false })
      .limit(1, { foreignTable: "messages" })
      .order("created_at", { ascending: false });

    if (error) {
      // Fallback to plain getConversations if the lateral join fails
      return null;
    }
    return data ?? [];
  },
};

// ─── DB Types (mirrors schema columns the frontend cares about) ─
export interface DBMessage {
  id:              string;
  conversation_id: string;
  sender_id:       string;
  content:         string;
  created_at:      string;
}

export interface DBListing {
  id:             string;
  user_id:        string;
  building_name:  string;
  category:       string;
  price_per_month: number;
  zone:           string;
  is_leased:      boolean;
  created_at:     string;
}

export interface DBCrashPost {
  id:         string;
  user_id:    string;
  vibe:       string;
  story:      string;
  zone:       string;
  status:     string;
  created_at: string;
}

export interface DBConversation {
  id:              string;
  participant1_id: string;
  participant2_id: string;
  listing_ref:     string;
  listing_building: string;
  created_at:      string;
}

export interface TrustInfo {
  degree:       1 | 2 | null;
  mutualFriends: { name: string; email: string; avatarColor: string }[];
  vouchedBy:    { name: string; email: string }[];
  sharedOrgs:   string[];
}

// ─── Payload types ────────────────────────────────────────────
export interface UpsertUserPayload {
  name:             string;
  major?:           string;
  bio?:             string;
  budget?:          number;
  gender?:          string;
  genderPref?:      string;
  cleanliness?:     number;
  noise?:           number;
  leaseType?:       string;
  zone?:            string;
  staysThanksgiving?:  boolean;
  staysSpringBreak?:   boolean;
  avatarColor?:     string;
  profileImageUrl?: string;
  college?:         string;
  intent?:          string;
  organizations?:   string[];
  landlords?:       string[];
  vibeProfile?: {
    identity:         string;
    lookingFor:       string;
    starSign?:        string;
    mbti?:            string;
    year?:            string;
    greekLife?:       string;
    vices?:           string[];
    pets?:            string[];
    sleep?:           string;
    alarms?:          string;
    cleanlinessVibe?: string;
    groceries?:       string;
    guests?:          string;
    prompt?:          string;
    promptAnswer?:    string;
  };
}

export interface PostListingPayload {
  buildingName:       string;
  address?:           string;
  listingType?:       string;
  category?:          string;
  subCategory?:       string;
  leaseType?:         string;
  pricePerMonth?:     number;
  zone?:              string;
  availableDuringBreaks?: boolean;
  description?:       string;
  unitType?:          string;
  kitchenType?:       string;
  bathroomType?:      string;
  isPrivateBedroom?:  boolean;
  isPrivateBathroom?: boolean;
  floorPlanUrl?:      string;
  roomsAvailable?:    number;
  currentResidentBio?: string;
  moveInDate?:        string;
  moveOutDate?:       string;
  eventTag?:          string;
  cleaningFrequency?: string;
  shoePolicy?:        string;
  hasParking?:        boolean;
  roommatePreference?: string;
  landlords?:         string[];
  breakTypes?:        string[];
  amenities?:         Record<string, boolean>;
  images?:            string[];
}

export interface StartConversationPayload {
  targetSupabaseId: string;
  listingRef?:      string;
  listingBuilding?:  string;
  listingPrice?:     number;
  listingUnitType?:  string;
  source?:           "sublease" | "coseeker" | "crash_cash" | "market";
}

export interface PostCrashPayload {
  vibe:           "sos" | "offering";
  story:          string;
  imageUrl?:      string;
  dates?:         string;
  targetDate:     string;
  zone?:          string;
  currency:       string;
  currencyLabel?: string;
  approxLocation?: string;
}

export interface FeedbackPayload {
  rating:         "rescue" | "meh" | "love";
  issueCategory?: string;
  issueDetail?:   string;
}

export interface PostMarketListingPayload {
  title:           string;
  description?:    string;
  price:           number;
  category:        "textbooks" | "tech" | "furniture" | "bikes" | "clothing" | "other";
  condition:       "new" | "like_new" | "good" | "fair" | "for_parts";
  pickupLocation?: string;
  acceptsVenmo?:   boolean;
  acceptsCash?:    boolean;
  acceptsZelle?:   boolean;
  images?:         string[];
}

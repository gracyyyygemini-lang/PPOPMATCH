// POST /functions/v1/upsert-user
// Creates or updates the full user profile (core + organizations + landlord prefs + vibe).
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    const body = await req.json();
    const {
      name, major = "", bio = "", budget = 800,
      gender = "nonbinary", genderPref = "mixed",
      cleanliness = 3, noise = 3, leaseType = "full_year",
      zone = "campustown", staysThanksgiving = false, staysSpringBreak = false,
      avatarColor = "#005F73", profileImageUrl, college = "",
      intent, organizations = [], landlords = [],
      vibeProfile,
    } = body;

    if (!name?.trim()) return corsError("name is required");

    // Upsert core user row
    const { data: user, error: userErr } = await adminClient
      .from("users")
      .upsert({
        firebase_uid: claims.uid,
        email: claims.email,
        name: name.trim(),
        major, bio, budget,
        gender, gender_pref: genderPref,
        cleanliness, noise, lease_type: leaseType,
        zone, stays_thanksgiving: staysThanksgiving,
        stays_spring_break: staysSpringBreak,
        avatar_color: avatarColor,
        profile_image_url: profileImageUrl ?? null,
        college, intent: intent ?? null,
      }, { onConflict: "firebase_uid" })
      .select("id")
      .single();

    if (userErr) throw userErr;
    const userId = user.id;

    // Replace organizations
    await adminClient.from("user_organizations").delete().eq("user_id", userId);
    if (organizations.length > 0) {
      await adminClient.from("user_organizations").insert(
        organizations.map((org: string) => ({ user_id: userId, organization: org }))
      );
    }

    // Replace landlord prefs
    await adminClient.from("user_landlord_prefs").delete().eq("user_id", userId);
    if (landlords.length > 0) {
      await adminClient.from("user_landlord_prefs").insert(
        landlords.map((l: string) => ({ user_id: userId, landlord: l }))
      );
    }

    // Upsert vibe profile if provided
    if (vibeProfile) {
      const { vices = [], pets = [], ...vibeCore } = vibeProfile;

      await adminClient.from("user_vibe_profiles").upsert({
        user_id: userId,
        identity:          vibeCore.identity,
        looking_for:       vibeCore.lookingFor,
        star_sign:         vibeCore.starSign ?? null,
        mbti:              vibeCore.mbti ?? null,
        year:              vibeCore.year ?? null,
        greek_life:        vibeCore.greekLife ?? null,
        sleep:             vibeCore.sleep ?? null,
        alarms:            vibeCore.alarms ?? null,
        cleanliness_vibe:  vibeCore.cleanlinessVibe ?? null,
        groceries:         vibeCore.groceries ?? null,
        guests:            vibeCore.guests ?? null,
        prompt:            vibeCore.prompt ?? null,
        prompt_answer:     vibeCore.promptAnswer ?? null,
      }, { onConflict: "user_id" });

      await adminClient.from("user_vibe_vices").delete().eq("user_id", userId);
      if (vices.length > 0) {
        await adminClient.from("user_vibe_vices").insert(
          vices.map((v: string) => ({ user_id: userId, vice: v }))
        );
      }

      await adminClient.from("user_vibe_pets").delete().eq("user_id", userId);
      if (pets.length > 0) {
        await adminClient.from("user_vibe_pets").insert(
          pets.map((p: string) => ({ user_id: userId, pet: p }))
        );
      }
    }

    // Increment total_users stat on first insert (when firebase_uid didn't exist before)
    // We approximate this: if updated_at == created_at the row was just inserted
    const { data: freshUser } = await adminClient
      .from("users")
      .select("id, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (freshUser && freshUser.created_at === freshUser.updated_at) {
      await adminClient.rpc("increment_stat", { stat_key: "total_users" });
    }

    return corsResponse({ id: userId, email: claims.email });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

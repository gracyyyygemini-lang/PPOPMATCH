// POST /functions/v1/post-listing
// Creates a new listing with amenities, images, landlords, and break types.
// Requires: Authorization: Bearer <firebase-id-token>
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { verifyFirebaseToken } from "../_shared/firebase.ts";
import { adminClient } from "../_shared/supabase-admin.ts";
import { CORS_HEADERS, corsResponse, corsError, msgOf } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const claims = await verifyFirebaseToken(req.headers.get("Authorization"));

    // Resolve the Supabase user id from firebase_uid
    const { data: userRow, error: userErr } = await adminClient
      .from("users")
      .select("id")
      .eq("firebase_uid", claims.uid)
      .single();

    if (userErr || !userRow) return corsError("User not found — complete onboarding first", 404);
    const userId = userRow.id;

    const body = await req.json();
    const {
      buildingName, address = "", listingType = "sublease",
      category = "semester_takeover", subCategory,
      leaseType = "full_year", pricePerMonth = 0, zone = "campustown",
      availableDuringBreaks = false, description = "",
      unitType, kitchenType, bathroomType,
      isPrivateBedroom = false, isPrivateBathroom = false,
      floorPlanUrl, roomsAvailable, currentResidentBio,
      moveInDate, moveOutDate, eventTag,
      cleaningFrequency, shoePolicy,
      hasParking = false, roommatePreference,
      landlords = [], breakTypes = [],
      amenities = {}, images = [],
    } = body;

    if (!buildingName?.trim()) return corsError("buildingName is required");
    if (pricePerMonth < 0)    return corsError("pricePerMonth must be ≥ 0");

    // Normalize category: frontend uses short labels that differ from the DB enum
    const CATEGORY_MAP: Record<string, string> = {
      summer:            "summer_only",
      summer_only:       "summer_only",
      spring:            "semester_takeover",
      fall:              "semester_takeover",
      full_year:         "semester_takeover",
      semester_takeover: "semester_takeover",
      short_term:        "short_term",
      august_gap:        "august_gap",
      roommate_openings: "roommate_openings",
    };
    const normalizedCategory = CATEGORY_MAP[category] ?? "semester_takeover";

    // Insert the listing
    const { data: listing, error: listErr } = await adminClient
      .from("listings")
      .insert({
        user_id: userId,
        building_name:         buildingName.trim(),
        address,
        listing_type:          listingType,
        category:              normalizedCategory,
        sub_category:          subCategory ?? null,
        lease_type:            leaseType,
        price_per_month:       pricePerMonth,
        zone,
        available_during_breaks: availableDuringBreaks,
        description,
        unit_type:             unitType ?? null,
        kitchen_type:          kitchenType ?? null,
        bathroom_type:         bathroomType ?? null,
        is_private_bedroom:    isPrivateBedroom,
        is_private_bathroom:   isPrivateBathroom,
        floor_plan_url:        floorPlanUrl ?? null,
        rooms_available:       roomsAvailable ?? null,
        current_resident_bio:  currentResidentBio ?? null,
        move_in_date:          moveInDate ?? null,
        move_out_date:         moveOutDate ?? null,
        event_tag:             eventTag ?? null,
        cleaning_frequency:    cleaningFrequency ?? null,
        shoe_policy:           shoePolicy ?? null,
        has_parking:           hasParking,
        roommate_preference:   roommatePreference ?? null,
      })
      .select("id")
      .single();

    if (listErr) throw listErr;
    const listingId = listing.id;

    // Landlords
    if (landlords.length > 0) {
      await adminClient.from("listing_landlords").insert(
        landlords.map((l: string) => ({ listing_id: listingId, landlord: l }))
      );
    }

    // Break types
    if (breakTypes.length > 0) {
      await adminClient.from("listing_break_types").insert(
        breakTypes.map((b: string) => ({ listing_id: listingId, break_type: b }))
      );
    }

    // Amenities (always insert a row, defaults to all false)
    await adminClient.from("listing_amenities").insert({
      listing_id:      listingId,
      is_furnished:    amenities.isFurnished    ?? false,
      has_laundry:     amenities.hasLaundry     ?? false,
      has_wifi:        amenities.hasWifi        ?? false,
      has_ac:          amenities.hasAC          ?? false,
      has_study_lounge: amenities.hasStudyLounge ?? false,
      has_printing:    amenities.hasPrinting    ?? false,
      has_bike_storage: amenities.hasBikeStorage ?? false,
      has_security:    amenities.hasSecurity    ?? false,
      utils_included:  amenities.utilsIncluded  ?? false,
      no_deposit:      amenities.noDeposit      ?? false,
      parking_included: amenities.parkingIncluded ?? false,
      has_gym:         amenities.hasGym         ?? false,
      has_pool:        amenities.hasPool        ?? false,
      has_elevator:    amenities.hasElevator    ?? false,
      has_rooftop:     amenities.hasRooftop     ?? false,
      has_lockers:     amenities.hasLockers     ?? false,
    });

    // Images (ordered)
    if (images.length > 0) {
      await adminClient.from("listing_images").insert(
        images.map((url: string, i: number) => ({
          listing_id: listingId, url, display_order: i,
        }))
      );
    }

    return corsResponse({ id: listingId });
  } catch (err) {
    const msg = msgOf(err);
    const status = msg.includes("Authorization") || msg.includes("token") ? 401 : 400;
    return corsError(msg, status);
  }
});

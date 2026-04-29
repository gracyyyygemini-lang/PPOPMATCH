// Verifies a Firebase ID token using Firebase's public JWKS endpoint.
// Runs on Deno (Supabase Edge Functions runtime).
import * as jose from "https://deno.land/x/jose@v4.15.5/index.ts";

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";

const JWKS = jose.createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export interface FirebaseClaims {
  uid: string;
  email: string;
}

export async function verifyFirebaseToken(
  authHeader: string | null
): Promise<FirebaseClaims> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }
  const token = authHeader.slice(7);

  const { payload } = await jose.jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });

  const uid = payload.sub;
  const email = payload["email"] as string | undefined;

  if (!uid || !email) {
    throw new Error("Firebase token missing sub or email claim");
  }
  if (!email.endsWith(".edu")) {
    throw new Error("Only .edu addresses are allowed");
  }

  return { uid, email };
}

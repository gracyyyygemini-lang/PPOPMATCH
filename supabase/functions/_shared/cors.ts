export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function corsError(message: string, status = 400): Response {
  return corsResponse({ error: message }, status);
}

/** Extracts a readable message from any thrown value (Error, Supabase object, string, etc.) */
export function msgOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  const e = err as any;
  return e?.message ?? e?.details ?? e?.hint ?? JSON.stringify(e) ?? "Unknown error";
}

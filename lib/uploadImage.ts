/**
 * Shared image upload utility — uploads to Supabase Storage, returns public URL.
 *
 * Primary path: callers pass a data URI (`data:image/jpeg;base64,...`) that
 * ImagePicker produces when `base64: true` is set — no file-system read needed.
 *
 * Fallback path: if a plain `file://` URI is passed, expo-file-system reads it.
 *
 * All features share the `market-images` bucket with subfolder prefixes:
 *   listings/ · crash/ · market/ · avatars/
 */
import * as FileSystem from "expo-file-system";
import { supabase } from "./supabaseClient";

const BUCKET = "market-images";

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function uploadImageUri(
  uri: string,
  folder: "listings" | "crash" | "market" | "avatars"
): Promise<string> {
  let base64: string;
  let mime: string;

  if (uri.startsWith("data:")) {
    // Fast path — base64 already embedded in the URI by ImagePicker
    const commaIdx = uri.indexOf(",");
    mime   = uri.slice(5, uri.indexOf(";", 5));
    base64 = uri.slice(commaIdx + 1);
  } else {
    // Fallback — read local file:// URI via native file system
    base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  }

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Use Uint8Array instead of decode() from base64-arraybuffer
  // decode() produces empty ArrayBuffers in some React Native environments
  const uint8Array = base64ToUint8Array(base64);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, uint8Array, { contentType: mime });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

// Sequential — avoids hammering the free-tier rate limit
export async function uploadImageUris(
  uris: string[],
  folder: "listings" | "crash" | "market" | "avatars"
): Promise<string[]> {
  const urls: string[] = [];
  for (const uri of uris) {
    urls.push(await uploadImageUri(uri, folder));
  }
  return urls;
}

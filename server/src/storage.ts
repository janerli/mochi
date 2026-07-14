import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? "attachments";

// Only needed for the attachments feature — everything else works without
// these env vars set, so this stays lazy rather than throwing at import time.
function client() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use file attachments");
  }
  // Service-role key — server-only, never send this to the browser. Bucket
  // access control is enforced by our own workspace-membership checks in
  // routes/attachments.ts, not by Supabase RLS (the bucket can stay private
  // with no public policies at all).
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

export async function uploadFile(objectPath: string, data: Buffer, contentType: string) {
  const { error } = await client().storage.from(BUCKET).upload(objectPath, data, { contentType, upsert: false });
  if (error) throw error;
}

export async function downloadFile(objectPath: string): Promise<Buffer> {
  const { data, error } = await client().storage.from(BUCKET).download(objectPath);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteFile(objectPath: string) {
  const { error } = await client().storage.from(BUCKET).remove([objectPath]);
  if (error) throw error;
}

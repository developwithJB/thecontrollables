import { supabase } from "@/integrations/supabase/client";

/** Normalize old public URLs and new stable paths. Storage RLS enforces ownership. */
export function certificateStoragePath(
  value: string,
  backendUrl: string,
): string {
  let path = value;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (url.origin !== new URL(backendUrl).origin)
      throw new Error("Invalid certificate location");
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:public|sign|authenticated)\/certificates\/(.+)$/,
    );
    if (!match) throw new Error("Invalid certificate location");
    path = decodeURIComponent(match[1]);
  }
  if (path === "Certificate Template.png") return path;
  if (!/^[a-f0-9-]{36}\/[a-zA-Z0-9_-]+\.(svg|png)$/i.test(path))
    throw new Error("Invalid certificate path");
  return path;
}

export async function privateCertificateUrl(value: string): Promise<string> {
  const path = certificateStoragePath(value, import.meta.env.VITE_SUPABASE_URL);
  const { data, error } = await supabase.storage
    .from("certificates")
    .createSignedUrl(path, 300);
  if (error || !data?.signedUrl)
    throw new Error("Certificate download unavailable");
  return data.signedUrl;
}

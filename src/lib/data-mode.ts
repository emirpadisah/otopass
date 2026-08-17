export type DataMode = "local" | "supabase";

function hasSupabaseEnvironment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getDataMode(): DataMode {
  const requestedMode = process.env.OTOPASS_DATA_MODE?.trim().toLowerCase();

  if (process.env.NODE_ENV === "production") {
    if (requestedMode === "local") throw new Error("Production ortamında local veri modu kullanılamaz.");
    if (!hasSupabaseEnvironment()) throw new Error("Production için Supabase ortam değişkenleri zorunludur.");
    return "supabase";
  }

  if (requestedMode === "local") return "local";
  if (requestedMode === "supabase") return "supabase";

  return hasSupabaseEnvironment() ? "supabase" : "local";
}

export function isLocalDataMode(): boolean {
  return getDataMode() === "local";
}

export function isLocalUserAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    isLocalDataMode() &&
    process.env.OTOPASS_ENABLE_LOCAL_AUTH?.trim().toLowerCase() === "true"
  );
}

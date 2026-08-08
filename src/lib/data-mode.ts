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

  if (requestedMode === "local") return "local";
  if (requestedMode === "supabase") return "supabase";

  return hasSupabaseEnvironment() ? "supabase" : "local";
}

export function isLocalDataMode(): boolean {
  return getDataMode() === "local";
}

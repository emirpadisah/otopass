function requireEnv(name: string): string {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value;
  }

  throw new Error(
    [
      `Missing required environment variable: ${name}`,
      "Create a `.env.local` file (for example by copying `.env.example`) and restart the dev server.",
    ].join(" ")
  );
}

export function getSupabasePublicEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

export function getSupabaseServiceEnv() {
  return {
    url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

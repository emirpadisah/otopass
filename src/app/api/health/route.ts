import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = performance.now();
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("app_settings").select("key", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ready", database: "reachable", latencyMs: Math.round(performance.now() - started) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "not_ready", database: "unreachable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

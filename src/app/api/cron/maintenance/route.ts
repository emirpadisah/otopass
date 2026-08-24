import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";
import { timingSafeSecretEqual } from "@/lib/security/secrets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const actual = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || expected.length < 32 || !timingSafeSecretEqual(actual, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const maintenance = await runMaintenance();
    return NextResponse.json({ ok: true, maintenance });
  } catch (error) {
    Sentry.captureException(error, { tags: { job: "maintenance" } });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

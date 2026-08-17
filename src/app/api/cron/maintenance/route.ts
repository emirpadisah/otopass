import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { runMaintenance } from "@/lib/maintenance";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const maintenance = await runMaintenance();
    return NextResponse.json({ ok: true, maintenance });
  } catch (error) {
    Sentry.captureException(error, { tags: { job: "maintenance" } });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

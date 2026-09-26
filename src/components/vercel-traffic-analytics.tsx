"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function filterPublicPageViews(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    const pathname = url.pathname;

    if (
      pathname === "/admin" || pathname.startsWith("/admin/") ||
      pathname === "/dealer" || pathname.startsWith("/dealer/") ||
      pathname === "/login" || pathname.startsWith("/login/") ||
      pathname === "/api" || pathname.startsWith("/api/")
    ) {
      return null;
    }

    url.search = "";
    url.hash = "";
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}

export function VercelTrafficAnalytics() {
  return <Analytics beforeSend={filterPublicPageViews} />;
}

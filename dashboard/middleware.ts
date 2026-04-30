/**
 * Localhost-only guard for the dashboard.
 *
 * The dashboard API has no per-route auth and exposes destructive
 * operations (create/delete episodes, trigger renders, publish to YouTube,
 * etc). It is designed for a single local operator.
 *
 * This middleware blocks requests whose remote address is not loopback,
 * unless `DASHBOARD_ALLOW_REMOTE=1` is explicitly set in the environment.
 *
 * If you need to expose the dashboard publicly, you MUST add real
 * authentication (e.g. NextAuth, Bearer token, reverse-proxy SSO) before
 * setting DASHBOARD_ALLOW_REMOTE.
 */

import { NextRequest, NextResponse } from "next/server";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function middleware(req: NextRequest) {
  if (process.env.DASHBOARD_ALLOW_REMOTE === "1") {
    return NextResponse.next();
  }

  // Next.js exposes client IP via the `x-forwarded-for` chain or
  // `request.ip` (edge runtime). We accept loopback only.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") ?? "") || "";

  // No proxy headers at all (direct local connection) → assume loopback.
  if (!ip) return NextResponse.next();

  if (LOOPBACK.has(ip)) return NextResponse.next();

  return new NextResponse(
    JSON.stringify({
      error: "Forbidden",
      message:
        "Dashboard is restricted to localhost. Set DASHBOARD_ALLOW_REMOTE=1 only after adding real authentication.",
    }),
    { status: 403, headers: { "content-type": "application/json" } }
  );
}

export const config = {
  matcher: ["/api/:path*"],
};

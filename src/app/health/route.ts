import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Minimal health check — deliberately does not reveal env var state,
// infrastructure details, or service-role key presence.
export function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
  });
}

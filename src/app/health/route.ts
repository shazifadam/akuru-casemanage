import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      supabaseUrl:  !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRole:  !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}

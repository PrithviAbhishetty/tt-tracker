import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Bulk sync endpoint. Forwards each match to /api/matches and returns
 * per-item results so the client can dequeue successes individually.
 * Useful for clients that prefer a single round-trip; the per-match
 * endpoint is still the canonical write path.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { matches?: unknown[] } | null;
  if (!body?.matches || !Array.isArray(body.matches)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const cookie = request.headers.get("cookie") ?? "";
  const results = await Promise.all(
    body.matches.map(async (m) => {
      try {
        const res = await fetch(`${origin}/api/matches`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify(m),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, ...data };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "fetch_failed" };
      }
    }),
  );

  return NextResponse.json({ results });
}

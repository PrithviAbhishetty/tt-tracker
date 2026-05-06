import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorUrl = url.clone();
      errorUrl.pathname = "/sign-in";
      errorUrl.search = `?error=${encodeURIComponent(error.message)}`;
      return NextResponse.redirect(errorUrl);
    }

    // Ensure a player row exists for the newly signed-in user.
    await ensurePlayerForUser();
  }

  const dest = url.clone();
  dest.pathname = next.startsWith("/") ? next : "/";
  dest.search = "";
  return NextResponse.redirect(dest);
}

async function ensurePlayerForUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return;

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Player";

  await supabase.from("players").insert({
    display_name: displayName,
    user_id: user.id,
    created_by: user.id,
  });
}

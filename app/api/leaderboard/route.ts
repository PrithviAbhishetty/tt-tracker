import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: players }, { count: matches }] = await Promise.all([
    supabase
      .from("players")
      .select("id, display_name, user_id, elo_rating, games_played, is_active")
      .eq("is_active", true)
      .order("elo_rating", { ascending: false })
      .limit(100),
    supabase.from("matches").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    players: players ?? [],
    matches: matches ?? 0,
  });
}

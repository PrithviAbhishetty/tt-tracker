import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("players")
    .select("id, display_name, user_id, elo_rating, games_played, is_active")
    .eq("is_active", true)
    .order("display_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { display_name?: string } | null;
  const name = body?.display_name?.trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("players")
    .insert({ display_name: name, created_by: user.id })
    .select("id, display_name, user_id, elo_rating, games_played, is_active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

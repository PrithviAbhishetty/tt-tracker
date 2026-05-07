import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { player_id?: string; role?: "owner" | "member" }
    | null;
  const playerId = body?.player_id;
  const role = body?.role === "owner" ? "owner" : "member";
  if (!playerId) return NextResponse.json({ error: "Invalid player_id" }, { status: 400 });

  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: id, player_id: playerId, role });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const playerId = url.searchParams.get("player_id");
  if (!playerId) return NextResponse.json({ error: "Invalid player_id" }, { status: 400 });

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", id)
    .eq("player_id", playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as
    | { player_id?: string; role?: "owner" | "member" }
    | null;
  const playerId = body?.player_id;
  const role = body?.role;
  if (!playerId || (role !== "owner" && role !== "member")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("group_id", id)
    .eq("player_id", playerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

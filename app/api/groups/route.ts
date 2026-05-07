import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/groups/scoped";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, slug, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  // Find the player row for this user (auto-created on first sign-in via post-sign-in hook).
  const { data: ownerPlayer } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ownerPlayer) {
    return NextResponse.json({ error: "no_player_profile" }, { status: 400 });
  }

  // Slug uniqueness: append a short suffix on collision.
  const service = createServiceClient();
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data: conflict } = await service
      .from("groups")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!conflict) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data: group, error: gErr } = await supabase
    .from("groups")
    .insert({ name, slug, created_by: user.id })
    .select("id, name, slug, created_by, created_at")
    .single();
  if (gErr || !group) {
    return NextResponse.json({ error: gErr?.message || "create_failed" }, { status: 500 });
  }

  // Bootstrap creator as owner. Use service so we don't fight a chicken-and-egg
  // with is_group_owner() right after insert.
  const { error: mErr } = await service
    .from("group_members")
    .insert({ group_id: group.id, player_id: ownerPlayer.id, role: "owner" });
  if (mErr) {
    await service.from("groups").delete().eq("id", group.id);
    return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  return NextResponse.json(group, { status: 201 });
}

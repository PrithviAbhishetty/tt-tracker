import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // RLS allows delete only for guest rows (user_id is null) created by the caller.
  const { error, count } = await supabase
    .from("players")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    // FK restrict failures show up here as 23503; surface a friendly message.
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Player has match or tournament history; can't delete." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!count) {
    return NextResponse.json({ error: "Not found or not allowed." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

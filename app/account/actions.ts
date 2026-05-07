"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deactivateSelf(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  await supabase.from("players").update({ is_active: false }).eq("user_id", user.id);
  await supabase.auth.signOut();
  redirect("/");
}

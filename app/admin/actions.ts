"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function wipeUserData(userId: string): Promise<{ ok: true }> {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service.rpc("admin_wipe_user_data", { p_user_id: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  return { ok: true };
}

export async function wipeUserAndAuth(userId: string): Promise<{ ok: true }> {
  await requireAdmin();
  const service = createServiceClient();

  const { data: ownedGuests } = await service
    .from("players")
    .select("id, display_name")
    .eq("created_by", userId);
  const guestPlayers = ownedGuests ?? [];
  if (guestPlayers.length > 0) {
    // The user's own player row is also in here (created_by = self at sign-up).
    // Filter that out so a user with no guest registrations can still be deleted.
    const { data: selfPlayer } = await service
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const otherGuests = guestPlayers.filter((p) => p.id !== selfPlayer?.id);
    if (otherGuests.length > 0) {
      throw new Error(
        `Cannot delete: this user registered ${otherGuests.length} guest player(s). Re-attribute or delete them first: ${otherGuests
          .map((p) => p.display_name)
          .join(", ")}`,
      );
    }
  }

  const { error: wipeErr } = await service.rpc("admin_wipe_user_data", { p_user_id: userId });
  if (wipeErr) throw new Error(wipeErr.message);

  const { error: authErr } = await service.auth.admin.deleteUser(userId);
  if (authErr) throw new Error(authErr.message);

  revalidatePath("/admin");
  return { ok: true };
}

export async function wipeAllData(): Promise<{ ok: true }> {
  await requireAdmin();
  const service = createServiceClient();
  const { error } = await service.rpc("admin_wipe_all");
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  return { ok: true };
}

export async function factoryReset(): Promise<{ ok: true; deleted: number }> {
  await requireAdmin();
  const service = createServiceClient();

  const { error: wipeErr } = await service.rpc("admin_factory_reset_data");
  if (wipeErr) throw new Error(wipeErr.message);

  // Delete every auth user, paginating.
  let page = 1;
  let deleted = 0;
  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      const { error: dErr } = await service.auth.admin.deleteUser(u.id);
      if (dErr) throw new Error(`deleting ${u.email}: ${dErr.message}`);
      deleted++;
    }
    if (users.length < 200) break;
    page++;
  }

  revalidatePath("/admin");
  return { ok: true, deleted };
}

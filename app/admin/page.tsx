import { requireAdmin } from "@/lib/auth/admin";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminConsole } from "./console";

export const dynamic = "force-dynamic";

interface AdminUserRow {
  user_id: string | null;
  email: string;
  display_name: string;
  player_id: string | null;
  is_active: boolean;
  matches_recorded: number;
  tournaments_created: number;
  groups_created: number;
}

export default async function AdminPage() {
  await requireAdmin();
  const service = createServiceClient();

  const { data: authList } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = authList?.users ?? [];

  const { data: players } = await service
    .from("players")
    .select("id, display_name, user_id, is_active");
  const playerByUserId = new Map(
    (players ?? []).filter((p) => p.user_id).map((p) => [p.user_id as string, p]),
  );

  const [{ data: matches }, { data: tournaments }, { data: groups }] = await Promise.all([
    service.from("matches").select("recorded_by"),
    service.from("tournaments").select("created_by"),
    service.from("groups").select("created_by"),
  ]);

  const countBy = <T extends { [k: string]: unknown }>(rows: T[] | null, key: keyof T) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) {
      const v = r[key] as string | null;
      if (!v) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return m;
  };
  const matchCount = countBy(matches, "recorded_by");
  const tournamentCount = countBy(tournaments, "created_by");
  const groupCount = countBy(groups, "created_by");

  const rows: AdminUserRow[] = users.map((u) => {
    const player = playerByUserId.get(u.id);
    return {
      user_id: u.id,
      email: u.email ?? "(no email)",
      display_name: player?.display_name ?? u.email?.split("@")[0] ?? "—",
      player_id: player?.id ?? null,
      is_active: player?.is_active ?? true,
      matches_recorded: matchCount.get(u.id) ?? 0,
      tournaments_created: tournamentCount.get(u.id) ?? 0,
      groups_created: groupCount.get(u.id) ?? 0,
    };
  });
  rows.sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /admin ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          Admin
        </h1>
        <p className="text-sm text-ink-on-paper/70 mt-2">
          Caution: actions here are destructive. Each requires typed confirmation.
        </p>
      </div>
      <AdminConsole users={rows} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchGroupMembers } from "@/lib/groups/scoped";
import { GroupSettings } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/groups/${id}/settings`);

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, slug, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  const members = await fetchGroupMembers(id);
  const me = members.find((m) => m.player.user_id === user.id);
  if (me?.role !== "owner") notFound();

  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /groups/{group.slug}/settings ］</p>
        <h1 className="display text-3xl text-ink-on-paper tracking-tight mt-2 leading-none">
          {group.name} · settings
        </h1>
      </div>
      <GroupSettings
        groupId={group.id}
        initialName={group.name}
        members={members.map((m) => ({
          player_id: m.player.id,
          display_name: m.player.display_name,
          role: m.role,
          is_self: m.player.user_id === user.id,
        }))}
      />
    </div>
  );
}

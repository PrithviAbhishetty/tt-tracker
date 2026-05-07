import { createClient } from "@/lib/supabase/server";
import { fetchGroupMembers } from "@/lib/groups/scoped";
import { NewTournamentForm } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewTournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group: groupId } = await searchParams;

  let groupContext: { id: string; name: string; memberIds: string[] } | null = null;
  if (groupId) {
    const supabase = await createClient();
    const { data: group } = await supabase
      .from("groups")
      .select("id, name")
      .eq("id", groupId)
      .maybeSingle();
    if (group) {
      const members = await fetchGroupMembers(group.id);
      groupContext = {
        id: group.id,
        name: group.name,
        memberIds: members.map((m) => m.player.id),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /tournaments/new ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          New tournament
        </h1>
        {groupContext && (
          <p className="text-sm text-ink-on-paper/70 mt-2">
            for <span className="display text-ink-on-paper">{groupContext.name}</span> · members
            preselected
          </p>
        )}
      </div>
      <div className="paper paper-deckle px-5 py-6 tt-pop">
        <NewTournamentForm
          groupId={groupContext?.id ?? null}
          presetParticipants={groupContext?.memberIds ?? []}
        />
      </div>
    </div>
  );
}

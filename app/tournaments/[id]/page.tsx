import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TournamentView } from "./tournament-view";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("id, name, format, match_type, status, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!tournament) notFound();

  const { data: tms } = await supabase
    .from("tournament_matches")
    .select("id, round, position, side1_player_ids, side2_player_ids, match_id")
    .eq("tournament_id", id)
    .order("round")
    .order("position");

  const { data: matches } = await supabase
    .from("matches")
    .select("id, winning_side")
    .in("id", (tms ?? []).map((t) => t.match_id).filter((x): x is string => !!x));

  const winningSideByMatchId = new Map((matches ?? []).map((m) => [m.id, m.winning_side]));

  // Resolve player names for everyone referenced
  const allPlayerIds = Array.from(
    new Set(
      (tms ?? []).flatMap((t) => [...(t.side1_player_ids ?? []), ...(t.side2_player_ids ?? [])]),
    ),
  );
  const { data: players } = allPlayerIds.length
    ? await supabase.from("players").select("id, display_name").in("id", allPlayerIds)
    : { data: [] };
  const nameById = new Map((players ?? []).map((p) => [p.id, p.display_name]));

  return (
    <TournamentView
      tournament={tournament}
      tms={(tms ?? []).map((t) => ({
        ...t,
        winning_side: t.match_id ? winningSideByMatchId.get(t.match_id) ?? null : null,
      }))}
      nameById={Object.fromEntries(nameById)}
    />
  );
}

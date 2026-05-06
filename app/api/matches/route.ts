import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { MatchRecord } from "@/lib/types";

function validate(body: unknown): MatchRecord | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Partial<MatchRecord>;
  if (!b.client_uuid || typeof b.client_uuid !== "string") return null;
  if (b.match_type !== "singles" && b.match_type !== "doubles") return null;
  if (b.winning_side !== 1 && b.winning_side !== 2) return null;
  if (!b.played_at || typeof b.played_at !== "string") return null;
  if (!Array.isArray(b.side1_player_ids) || !Array.isArray(b.side2_player_ids)) return null;
  const expected = b.match_type === "doubles" ? 2 : 1;
  if (b.side1_player_ids.length !== expected || b.side2_player_ids.length !== expected) return null;
  // Ensure no overlap
  const allIds = [...b.side1_player_ids, ...b.side2_player_ids];
  if (new Set(allIds).size !== allIds.length) return null;
  return b as MatchRecord;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const match = validate(body);
  if (!match) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  // Idempotent on client_uuid: if we already have it, return success.
  const { data: existing } = await supabase
    .from("matches")
    .select("id")
    .eq("client_uuid", match.client_uuid)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ id: existing.id, status: "duplicate" });
  }

  const service = createServiceClient();

  // Insert match + match_players in a transaction-ish sequence. Use service role
  // to also write the auxiliary tables and trigger the ELO recompute.
  const { data: inserted, error: insertError } = await service
    .from("matches")
    .insert({
      match_type: match.match_type,
      winning_side: match.winning_side,
      played_at: match.played_at,
      recorded_by: user.id,
      tournament_match_id: match.tournament_match_id ?? null,
      client_uuid: match.client_uuid,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json({ error: insertError?.message || "insert_failed" }, { status: 500 });
  }

  const matchId = inserted.id;

  const playerRows = [
    ...match.side1_player_ids.map((id) => ({ match_id: matchId, player_id: id, side: 1 })),
    ...match.side2_player_ids.map((id) => ({ match_id: matchId, player_id: id, side: 2 })),
  ];

  const { error: playersError } = await service.from("match_players").insert(playerRows);
  if (playersError) {
    // Roll back match insert to avoid orphaned matches without players
    await service.from("matches").delete().eq("id", matchId);
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  // Apply or recompute ELO
  const { error: eloError } = await service.rpc("record_match_elo", { p_match_id: matchId });
  if (eloError) {
    return NextResponse.json({ error: eloError.message }, { status: 500 });
  }

  // If linked to a tournament match, advance the winner to the parent slot
  if (match.tournament_match_id) {
    await advanceTournamentWinner(match.tournament_match_id, match.winning_side, matchId);
  }

  return NextResponse.json({ id: matchId, status: "ok" });
}

async function advanceTournamentWinner(
  tournamentMatchId: string,
  winningSide: 1 | 2,
  matchId: string,
) {
  const service = createServiceClient();
  // Link the match to the tournament_match
  const { data: tm } = await service
    .from("tournament_matches")
    .select("id, winner_advances_to, winner_advances_to_side, side1_player_ids, side2_player_ids")
    .eq("id", tournamentMatchId)
    .maybeSingle();
  if (!tm) return;

  await service.from("tournament_matches").update({ match_id: matchId }).eq("id", tournamentMatchId);

  if (tm.winner_advances_to && tm.winner_advances_to_side) {
    const winnerIds = winningSide === 1 ? tm.side1_player_ids : tm.side2_player_ids;
    const col = tm.winner_advances_to_side === 1 ? "side1_player_ids" : "side2_player_ids";
    await service
      .from("tournament_matches")
      .update({ [col]: winnerIds })
      .eq("id", tm.winner_advances_to);
  }
}

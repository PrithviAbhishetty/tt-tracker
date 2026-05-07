import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateRoundRobin } from "@/lib/tournament/round-robin";
import { generateBracket } from "@/lib/tournament/bracket";

interface ParticipantInput {
  team_label: string | null;
  player_ids: string[];
}

interface CreateInput {
  name: string;
  format: "round_robin" | "single_elim";
  match_type: "singles" | "doubles";
  participants: ParticipantInput[];
  group_id?: string | null;
}

function validate(body: unknown): CreateInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Partial<CreateInput>;
  if (!b.name || typeof b.name !== "string") return null;
  if (b.format !== "round_robin" && b.format !== "single_elim") return null;
  if (b.match_type !== "singles" && b.match_type !== "doubles") return null;
  if (!Array.isArray(b.participants)) return null;
  const teamSize = b.match_type === "doubles" ? 2 : 1;
  for (const p of b.participants) {
    if (!Array.isArray(p.player_ids)) return null;
    if (p.player_ids.length !== teamSize) return null;
  }
  if (b.participants.length < 2) return null;
  // No duplicate players across teams
  const allIds = b.participants.flatMap((p) => p.player_ids);
  if (new Set(allIds).size !== allIds.length) return null;
  if (b.group_id != null && typeof b.group_id !== "string") return null;
  return b as CreateInput;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const input = validate(body);
  if (!input) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const service = createServiceClient();

  // Insert tournament
  const { data: tournament, error: tErr } = await service
    .from("tournaments")
    .insert({
      name: input.name,
      format: input.format,
      match_type: input.match_type,
      status: "in_progress",
      created_by: user.id,
      started_at: new Date().toISOString(),
      group_id: input.group_id ?? null,
    })
    .select("id")
    .single();
  if (tErr || !tournament) {
    return NextResponse.json({ error: tErr?.message || "create_failed" }, { status: 500 });
  }

  const tournamentId = tournament.id;

  // Insert participants. Use a synthetic team index (TI) as the participant key.
  // Build a parallel array of "teams" so the generators can refer to teams by index.
  const teamPlayerIds: string[][] = input.participants.map((p) => p.player_ids);
  const teamLabels: (string | null)[] = input.participants.map((p, i) => p.team_label ?? `T${i + 1}`);

  // Insert each player as a tournament_participant with the same team_label
  const partRows: { tournament_id: string; player_id: string; team_label: string | null; seed: number | null }[] = [];
  teamPlayerIds.forEach((pids, idx) => {
    for (const pid of pids) {
      partRows.push({
        tournament_id: tournamentId,
        player_id: pid,
        team_label: teamLabels[idx],
        seed: idx + 1, // for now, declared order is the seed
      });
    }
  });

  const { error: partErr } = await service.from("tournament_participants").insert(partRows);
  if (partErr) {
    await service.from("tournaments").delete().eq("id", tournamentId);
    return NextResponse.json({ error: partErr.message }, { status: 500 });
  }

  // Generate matches
  if (input.format === "round_robin") {
    // Use team index as the generator key so doubles teams stay together.
    const indices = teamPlayerIds.map((_, i) => i);
    const { rounds } = generateRoundRobin(indices);
    const tmRows: {
      tournament_id: string;
      round: number;
      position: number;
      side1_player_ids: string[];
      side2_player_ids: string[];
    }[] = [];
    rounds.forEach((round, rIdx) => {
      round.forEach((pair, pIdx) => {
        tmRows.push({
          tournament_id: tournamentId,
          round: rIdx + 1,
          position: pIdx,
          side1_player_ids: teamPlayerIds[pair.side1],
          side2_player_ids: teamPlayerIds[pair.side2],
        });
      });
    });
    const { error: tmErr } = await service.from("tournament_matches").insert(tmRows);
    if (tmErr) return NextResponse.json({ error: tmErr.message }, { status: 500 });
  } else {
    // Single elim: use team-id arrays as the participant payload
    const { matches: slots, byeIndices } = generateBracket(teamPlayerIds);
    // Insert all slots first to get their UUIDs, then update parent pointers
    const inserts = slots.map((s) => ({
      tournament_id: tournamentId,
      round: s.round,
      position: s.position,
      side1_player_ids: s.side1,
      side2_player_ids: s.side2,
    }));
    const { data: insertedSlots, error: insErr } = await service
      .from("tournament_matches")
      .insert(inserts)
      .select("id, round, position");
    if (insErr || !insertedSlots) {
      return NextResponse.json({ error: insErr?.message || "bracket_failed" }, { status: 500 });
    }
    // Map (round, position) -> id
    const idByKey = new Map<string, string>();
    for (const row of insertedSlots) {
      idByKey.set(`${row.round}:${row.position}`, row.id);
    }
    // Update parent pointers for slots that have a parent
    for (const slot of slots) {
      if (slot.winnerAdvancesToPosition === null) continue;
      const childId = idByKey.get(`${slot.round}:${slot.position}`);
      const parentId = idByKey.get(`${slot.round + 1}:${slot.winnerAdvancesToPosition}`);
      if (!childId || !parentId) continue;
      await service
        .from("tournament_matches")
        .update({
          winner_advances_to: parentId,
          winner_advances_to_side: slot.winnerAdvancesToSide,
        })
        .eq("id", childId);
    }
    // Auto-advance byes: any round-1 slot where one side is empty pre-fills the parent
    for (const idx of byeIndices) {
      const slot = slots[idx];
      const populated = slot.side1.length > 0 ? slot.side1 : slot.side2;
      if (slot.winnerAdvancesToPosition === null) continue;
      const parentId = idByKey.get(`${slot.round + 1}:${slot.winnerAdvancesToPosition}`);
      if (!parentId) continue;
      const col = slot.winnerAdvancesToSide === 1 ? "side1_player_ids" : "side2_player_ids";
      await service
        .from("tournament_matches")
        .update({ [col]: populated })
        .eq("id", parentId);
    }
  }

  return NextResponse.json({ id: tournamentId });
}

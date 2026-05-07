import { createClient } from "@/lib/supabase/server";
import type { PlayerRow } from "@/lib/types";

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "group";
}

export async function fetchGroupMemberPlayerIds(groupId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select("player_id")
    .eq("group_id", groupId);
  return (data ?? []).map((r) => r.player_id);
}

export interface GroupMemberView {
  player: PlayerRow;
  role: "owner" | "member";
  joined_at: string;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMemberView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("group_members")
    .select(
      "role, joined_at, player:players(id, display_name, user_id, elo_rating, games_played, is_active)",
    )
    .eq("group_id", groupId);
  return (data ?? []).map((r) => ({
    role: r.role as "owner" | "member",
    joined_at: r.joined_at as string,
    player: r.player as unknown as PlayerRow,
  }));
}

export interface GroupMatchSummary {
  id: string;
  match_type: "singles" | "doubles";
  winning_side: 1 | 2;
  played_at: string;
  rated: boolean;
  side1: string[];
  side2: string[];
}

/** Matches whose every participant is a member of the group, newest first. */
export async function fetchGroupMatches(
  groupId: string,
  limit = 25,
): Promise<GroupMatchSummary[]> {
  const memberIds = await fetchGroupMemberPlayerIds(groupId);
  if (memberIds.length < 2) return [];

  const supabase = await createClient();
  const { data: candidates } = await supabase
    .from("match_players")
    .select(
      "match_id, player_id, side, matches!inner(id, match_type, winning_side, played_at, rated)",
    )
    .in("player_id", memberIds)
    .order("match_id");

  if (!candidates) return [];

  const byMatch = new Map<
    string,
    {
      meta: {
        match_type: "singles" | "doubles";
        winning_side: 1 | 2;
        played_at: string;
        rated: boolean;
      };
      side1: string[];
      side2: string[];
      seen: number;
    }
  >();
  for (const row of candidates) {
    const m = row.matches as unknown as {
      id: string;
      match_type: "singles" | "doubles";
      winning_side: 1 | 2;
      played_at: string;
      rated: boolean;
    };
    const entry = byMatch.get(row.match_id) ?? {
      meta: {
        match_type: m.match_type,
        winning_side: m.winning_side,
        played_at: m.played_at,
        rated: m.rated,
      },
      side1: [] as string[],
      side2: [] as string[],
      seen: 0,
    };
    if (row.side === 1) entry.side1.push(row.player_id);
    else entry.side2.push(row.player_id);
    entry.seen++;
    byMatch.set(row.match_id, entry);
  }

  const results: GroupMatchSummary[] = [];
  for (const [id, entry] of byMatch) {
    const expected = entry.meta.match_type === "doubles" ? 4 : 2;
    if (entry.seen !== expected) continue;
    results.push({
      id,
      match_type: entry.meta.match_type,
      winning_side: entry.meta.winning_side,
      played_at: entry.meta.played_at,
      rated: entry.meta.rated,
      side1: entry.side1,
      side2: entry.side2,
    });
  }

  results.sort((a, b) => (a.played_at < b.played_at ? 1 : -1));
  return results.slice(0, limit);
}

export async function fetchGroupLeaderboard(groupId: string): Promise<PlayerRow[]> {
  const memberIds = await fetchGroupMemberPlayerIds(groupId);
  if (memberIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("id, display_name, user_id, elo_rating, games_played, is_active")
    .in("id", memberIds)
    .not("user_id", "is", null)
    .order("elo_rating", { ascending: false });
  return (data ?? []) as PlayerRow[];
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EloHistoryChart } from "@/components/elo-history-chart";
import { Hanko } from "@/components/decor/hanko";
import { CountUp } from "@/components/decor/count-up";
import { DeleteGuestButton } from "./delete-guest-button";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, user_id, elo_rating, games_played, is_active, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!player) notFound();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const canDelete =
    !!currentUser &&
    !player.user_id &&
    player.created_by === currentUser.id &&
    player.games_played === 0;

  // Determine player rank from active leaderboard
  const { data: ranking } = await supabase
    .from("players")
    .select("id")
    .eq("is_active", true)
    .order("elo_rating", { ascending: false });
  const rank = (ranking ?? []).findIndex((r) => r.id === id) + 1 || null;

  // Match history for this player
  const { data: matchPlayerRows } = await supabase
    .from("match_players")
    .select("match_id, side, matches!inner(id, match_type, winning_side, played_at, rated)")
    .eq("player_id", id);

  const matches = (matchPlayerRows ?? [])
    .map((row) => {
      const m = Array.isArray(row.matches) ? row.matches[0] : row.matches;
      return {
        match_id: row.match_id,
        side: row.side,
        ...m,
      };
    })
    .sort((a, b) => (a.played_at < b.played_at ? 1 : -1));

  // Pull opponent names
  const recentIds = matches.slice(0, 25).map((m) => m.match_id);
  let opponentsByMatch: Map<string, { name: string; side: number }[]> = new Map();
  if (recentIds.length) {
    const { data: opp } = await supabase
      .from("match_players")
      .select("match_id, side, players!inner(id, display_name)")
      .in("match_id", recentIds)
      .neq("player_id", id);
    opponentsByMatch = new Map();
    for (const row of opp ?? []) {
      const p = Array.isArray(row.players) ? row.players[0] : row.players;
      const arr = opponentsByMatch.get(row.match_id) ?? [];
      arr.push({ name: p.display_name, side: row.side });
      opponentsByMatch.set(row.match_id, arr);
    }
  }

  // ELO history
  const { data: snapshots } = await supabase
    .from("match_elo_snapshots")
    .select("match_id, rating_before, rating_after, matches!inner(played_at)")
    .eq("player_id", id)
    .order("matches(played_at)", { ascending: true });

  const chartData = (snapshots ?? []).map((s) => {
    const m = Array.isArray(s.matches) ? s.matches[0] : s.matches;
    return { played_at: m.played_at, rating: s.rating_after };
  });
  if (chartData.length > 0) {
    chartData.unshift({
      played_at: chartData[0].played_at,
      rating: (snapshots ?? [])[0].rating_before,
    });
  }

  const wins = matches.filter((m) => m.winning_side === m.side).length;
  const losses = matches.length - wins;
  const ratedMatches = matches.filter((m) => m.rated);
  const ratedWins = ratedMatches.filter((m) => m.winning_side === m.side).length;
  const ratedLosses = ratedMatches.length - ratedWins;

  const isGuest = !player.user_id;
  const rankKanji =
    isGuest ? null : rank === 1 ? "覇" : rank === 2 ? "二" : rank === 3 ? "三" : null;

  return (
    <div className="space-y-7">
      <Link
        href="/players"
        className="text-xs text-ink-on-paper/70 hover:text-ink-on-paper transition tt-rise inline-block"
      >
        ← Roster
      </Link>

      <div className="paper paper-deckle relative px-5 py-6 sm:px-7 sm:py-8 tt-pop">
        {rankKanji && (
          <div className="absolute -top-4 right-4 sm:-top-5 sm:right-6">
            <Hanko kanji={rankKanji} size={56} pulse={rank === 1} />
          </div>
        )}
        <p className="slug-on-paper">
          ［ player ］{!isGuest && rank ? ` rank №${String(rank).padStart(2, "0")}` : ""}
        </p>
        <div className="brush text-3xl sm:text-4xl text-ink mt-2 leading-tight truncate">
          {player.display_name}
        </div>
        {!player.user_id && (
          <div className="mt-1 flex items-center gap-3">
            <p className="text-[11px] uppercase tracking-wider text-ink-soft">guest</p>
            {canDelete && (
              <DeleteGuestButton playerId={player.id} playerName={player.display_name} />
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mt-6">
          {isGuest ? (
            <>
              <Stat label="games" value={matches.length} />
              <Stat
                label="W / L"
                customValue={
                  <span className="flex items-baseline gap-2">
                    <span className="display tnum">{wins}</span>
                    <span className="text-ink-soft text-base">/</span>
                    <span className="display tnum">{losses}</span>
                  </span>
                }
              />
              <Stat
                label="rating"
                customValue={
                  <span className="text-ink-soft text-2xl">—</span>
                }
              />
            </>
          ) : (
            <>
              <Stat label="elo" value={player.elo_rating} />
              <Stat label="rated" value={ratedMatches.length} />
              <Stat
                label="W / L (rated)"
                customValue={
                  <span className="flex items-baseline gap-2">
                    <span className="display tnum">{ratedWins}</span>
                    <span className="text-ink-soft text-base">/</span>
                    <span className="display tnum">{ratedLosses}</span>
                  </span>
                }
              />
            </>
          )}
        </div>
      </div>

      {!isGuest && chartData.length > 1 && (
        <div className="paper paper-deckle px-4 py-4 tt-rise" style={{ animationDelay: "120ms" }}>
          <div className="slug-on-paper mb-2">［ elo history ］</div>
          <EloHistoryChart data={chartData} />
        </div>
      )}

      <div className="tt-rise" style={{ animationDelay: "180ms" }}>
        <h2 className="display text-xl text-ink-on-paper mb-2">
          Recent matches
        </h2>
        {matches.length === 0 ? (
          <p className="text-sm text-ink-on-paper/70">No matches yet.</p>
        ) : (
          <ul className="paper paper-deckle divide-y divide-paper-edge/40">
            {matches.slice(0, 25).map((m) => {
              const won = m.winning_side === m.side;
              const opps = opponentsByMatch.get(m.match_id) ?? [];
              const teammates = opps.filter((o) => o.side === m.side).map((o) => o.name);
              const opponents = opps.filter((o) => o.side !== m.side).map((o) => o.name);
              return (
                <li
                  key={m.match_id}
                  className="px-4 py-3 text-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.22em] flex items-center gap-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 ${
                          won
                            ? "bg-accent text-paper-light"
                            : "bg-paper-edge/40 text-ink"
                        }`}
                      >
                        {won ? "Win" : "Loss"}
                      </span>
                      <span className="text-ink-soft">{m.match_type}</span>
                      {!m.rated && (
                        <span className="px-1.5 py-0.5 border border-paper-edge/40 text-ink-soft tracking-wider">
                          unrated
                        </span>
                      )}
                    </div>
                    <div className="truncate text-ink mt-1">
                      {teammates.length > 0 && (
                        <span className="text-ink-soft">w/ {teammates.join(", ")} · </span>
                      )}
                      <span className="text-ink-soft mx-1.5 italic">vs</span>{" "}
                      {opponents.join(", ") || "?"}
                    </div>
                  </div>
                  <div className="text-xs text-ink-soft mono whitespace-nowrap">
                    {new Date(m.played_at).toLocaleDateString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  customValue,
}: {
  label: string;
  value?: number;
  customValue?: React.ReactNode;
}) {
  return (
    <div className="border-l-2 border-paper-edge pl-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">{label}</div>
      <div className="display text-2xl text-ink mt-1 tnum">
        {customValue ? customValue : <CountUp value={value!} duration={800} />}
      </div>
    </div>
  );
}

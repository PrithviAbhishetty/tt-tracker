import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CountUp } from "@/components/decor/count-up";
import { Hanko } from "@/components/decor/hanko";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, user_id, elo_rating, games_played")
    .eq("is_active", true)
    .order("elo_rating", { ascending: false })
    .limit(100);

  const list = players ?? [];
  const champion = list[0];
  const rest = list.slice(1);

  const { count: matchesPlayed } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  const totalGames = list.reduce((sum, p) => sum + p.games_played, 0);
  const avgElo = list.length
    ? Math.round(list.reduce((s, p) => s + p.elo_rating, 0) / list.length)
    : 1200;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");

  return (
    <div className="space-y-7">
      {/* HERO */}
      <div className="tt-rise">
        <div className="flex items-center gap-3 text-ink-on-paper/80 text-[10px] uppercase tracking-[0.3em]">
          <span>［ ledger no.07 ］</span>
          <span className="h-px flex-1 bg-ink-on-paper/30" />
          <span className="mono">{today}</span>
        </div>
        <h1 className="display text-5xl sm:text-6xl tracking-tight text-ink-on-paper mt-3 leading-none">
          Rankings
        </h1>
        <p className="text-ink-on-paper/70 mt-2 text-sm">
          Compiled from match logs · ELO seeded at 1200 · K tiered 40/32/16
        </p>
      </div>

      {/* STAT STRIP */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 tt-rise"
        style={{ animationDelay: "80ms" }}
      >
        <Stat label="players" value={list.length} />
        <Stat label="matches" value={matchesPlayed ?? 0} />
        <Stat label="games" value={totalGames} />
        <Stat label="avg elo" value={avgElo} brushLabel />
      </div>

      {!champion ? (
        <EmptyState />
      ) : (
        <>
          {/* CHAMPION */}
          <div
            className="relative tt-pop"
            style={{ animationDelay: "160ms" }}
          >
            <Champion champion={champion} />
          </div>

          {/* CHALLENGERS */}
          {rest.length > 0 && (
            <Ranked list={rest} startIndex={2} />
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  brushLabel,
}: {
  label: string;
  value: number;
  brushLabel?: boolean;
}) {
  return (
    <div className="paper paper-deckle px-3 pt-4 pb-3">
      <div
        className={`text-[10px] uppercase tracking-[0.22em] text-ink-soft ${
          brushLabel ? "brush text-sm normal-case tracking-normal" : ""
        }`}
      >
        {label}
      </div>
      <div className="display text-2xl sm:text-3xl text-ink mt-1 tnum">
        <CountUp value={value} duration={800} />
      </div>
    </div>
  );
}

function Champion({
  champion,
}: {
  champion: { id: string; display_name: string; user_id: string | null; elo_rating: number; games_played: number };
}) {
  return (
    <Link
      href={`/players/${champion.id}`}
      className="block paper paper-deckle relative px-5 py-6 sm:px-7 sm:py-8 overflow-visible"
    >
      <div className="absolute -top-4 right-4 sm:-top-5 sm:right-6">
        <Hanko kanji="覇" size={64} pulse />
      </div>

<div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="slug-on-paper">［ champion ］ rank №01</div>
          <div className="brush text-3xl sm:text-4xl text-ink mt-2 truncate leading-tight">
            {champion.display_name}
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft mt-1.5">
            {champion.games_played} contests
            {!champion.user_id ? " · guest" : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">elo</div>
          <div className="display text-5xl sm:text-7xl text-ink leading-none tnum mt-1">
            <CountUp value={champion.elo_rating} duration={1100} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function Ranked({
  list,
  startIndex,
}: {
  list: { id: string; display_name: string; user_id: string | null; elo_rating: number; games_played: number }[];
  startIndex: number;
}) {
  return (
    <div
      className="paper paper-deckle tt-rise"
      style={{ animationDelay: "240ms" }}
    >
      <div className="px-4 py-3 border-b border-paper-edge/50 flex items-center justify-between">
        <div className="slug-on-paper">［ challengers ］</div>
        <div className="text-[10px] text-ink-soft mono">
          {list.length} entr{list.length === 1 ? "y" : "ies"}
        </div>
      </div>
      <ul className="divide-y divide-paper-edge/40">
        {list.map((p, i) => (
          <li
            key={p.id}
            className="row-hover tt-rise"
            style={{ animationDelay: `${280 + i * 35}ms` }}
          >
            <Link
              href={`/players/${p.id}`}
              className="group flex items-center justify-between px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="display text-ink-soft w-8 text-right tnum">
                  {String(startIndex + i).padStart(2, "0")}
                </span>
                <span className="relative flex items-center gap-2 truncate text-ink">
                  <span
                    aria-hidden
                    className="absolute -left-3 inline-block h-1.5 w-1.5 rounded-full bg-accent opacity-0 group-hover:opacity-100 group-hover:tt-ink-bloom"
                  />
                  {p.display_name}
                </span>
                {!p.user_id && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-paper-edge/50 text-ink-soft">
                    guest
                  </span>
                )}
              </div>
              <div className="flex items-center gap-5">
                <span className="text-xs text-ink-soft mono w-12 text-right">
                  {p.games_played}
                  <span className="opacity-60">G</span>
                </span>
                <span className="display text-ink w-14 text-right tnum">
                  <CountUp value={p.elo_rating} duration={700} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="paper paper-deckle p-10 text-center space-y-4 tt-pop">
      <div className="flex items-center justify-center gap-3 text-ink-soft text-[11px] uppercase tracking-[0.3em]">
        <span className="h-px w-6 bg-paper-edge/60" />
        no matches yet
        <span className="h-px w-6 bg-paper-edge/60" />
      </div>
      <p className="text-sm text-ink-soft">
        Add players, then log a result. The ledger awaits its first entry.
      </p>
      <Link
        href="/record"
        className="tt-press inline-block bg-accent text-paper-light px-5 py-2.5 text-sm font-medium hover:bg-accent-deep transition mt-1"
      >
        Record the first match
      </Link>
    </div>
  );
}

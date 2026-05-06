import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlayersListPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, user_id, elo_rating, games_played, is_active")
    .eq("is_active", true)
    .order("display_name");

  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /players ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          Roster
        </h1>
      </div>

      {!players || players.length === 0 ? (
        <p className="text-sm text-ink-on-paper/70">
          No players yet. Add one when you record a match.
        </p>
      ) : (
        <ul className="paper paper-deckle divide-y divide-paper-edge/40">
          {players.map((p, i) => (
            <li
              key={p.id}
              className="row-hover tt-rise"
              style={{ animationDelay: `${80 + i * 30}ms` }}
            >
              <Link
                href={`/players/${p.id}`}
                className="flex items-center justify-between px-4 py-3 text-ink"
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="display text-ink-soft tnum w-7 text-right">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{p.display_name}</span>
                  {!p.user_id && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-paper-edge/50 text-ink-soft">
                      guest
                    </span>
                  )}
                </span>
                <span className="text-sm text-ink-soft mono">
                  {p.elo_rating} · {p.games_played}G
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

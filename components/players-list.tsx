"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlayerRow } from "@/lib/types";
import { fetchPlayers } from "@/lib/offline/players-cache";

export function PlayersList() {
  const [players, setPlayers] = useState<PlayerRow[] | null>(null);

  useEffect(() => {
    void fetchPlayers().then(setPlayers);
  }, []);

  if (players === null) {
    return <p className="text-sm text-ink-on-paper/70">Loading…</p>;
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-ink-on-paper/70">
        No players yet. Add one when you record a match.
      </p>
    );
  }

  return (
    <ul className="paper paper-deckle divide-y divide-paper-edge/40">
      {players.map((p, i) => {
        const isPending = p.id.startsWith("temp_");
        const inner = (
          <span className="flex items-center justify-between w-full px-4 py-3 text-ink">
            <span className="flex items-center gap-3 min-w-0">
              <span className="display text-ink-soft tnum w-7 text-right">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{p.display_name}</span>
              {!p.user_id && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-paper-edge/50 text-ink-soft">
                  {isPending ? "pending" : "guest"}
                </span>
              )}
            </span>
            <span className="text-sm text-ink-soft mono">
              {p.elo_rating} · {p.games_played}G
            </span>
          </span>
        );
        return (
          <li
            key={p.id}
            className="row-hover tt-rise"
            style={{ animationDelay: `${80 + i * 30}ms` }}
          >
            {isPending ? (
              <div className="opacity-70">{inner}</div>
            ) : (
              <Link href={`/players/${p.id}`} className="block">
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

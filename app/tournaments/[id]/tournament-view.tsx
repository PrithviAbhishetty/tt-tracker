"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { recordMatch } from "@/lib/offline/sync";
import { Hanko } from "@/components/decor/hanko";

interface TM {
  id: string;
  round: number;
  position: number;
  side1_player_ids: string[];
  side2_player_ids: string[];
  match_id: string | null;
  winning_side: number | null;
}

interface Tournament {
  id: string;
  name: string;
  format: "round_robin" | "single_elim";
  match_type: "singles" | "doubles";
  status: "setup" | "in_progress" | "completed";
  created_by: string;
}

interface Props {
  tournament: Tournament;
  tms: TM[];
  nameById: Record<string, string>;
}

export function TournamentView({ tournament, tms, nameById }: Props) {
  const isRR = tournament.format === "round_robin";

  const rounds: Record<number, TM[]> = {};
  for (const t of tms) {
    (rounds[t.round] ??= []).push(t);
  }
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-7">
      <div className="paper paper-deckle relative px-5 py-5 sm:py-6 tt-pop">
        <div className="absolute -top-4 right-4">
          <Hanko kanji={isRR ? "輪" : "札"} size={48} rotate={-7} />
        </div>
        <p className="slug-on-paper">［ tournament ］</p>
        <h1 className="display text-3xl text-ink mt-1 leading-tight truncate">
          {tournament.name}
        </h1>
        <p className="text-xs text-ink-soft mt-1.5 uppercase tracking-[0.18em]">
          {isRR ? "Round-robin" : "Single elimination"} · {tournament.match_type} ·{" "}
          {tournament.status.replace("_", " ")}
        </p>
      </div>

      {isRR ? (
        <RoundRobinGrid tms={tms} nameById={nameById} tournament={tournament} />
      ) : (
        <BracketView
          roundNumbers={roundNumbers}
          rounds={rounds}
          nameById={nameById}
          tournament={tournament}
        />
      )}
    </div>
  );
}

function RoundRobinGrid({
  tms,
  nameById,
  tournament,
}: {
  tms: TM[];
  nameById: Record<string, string>;
  tournament: Tournament;
}) {
  const grouped: Record<number, TM[]> = {};
  for (const t of tms) (grouped[t.round] ??= []).push(t);
  const rounds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {rounds.map((r) => (
        <div key={r} className="space-y-2">
          <div className="slug">
            ［ round {String(r).padStart(2, "0")} ］
          </div>
          <ul className="paper paper-deckle divide-y divide-paper-edge/40">
            {grouped[r].map((t) => (
              <li key={t.id}>
                <MatchRow tm={t} nameById={nameById} tournament={tournament} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BracketView({
  roundNumbers,
  rounds,
  nameById,
  tournament,
}: {
  roundNumbers: number[];
  rounds: Record<number, TM[]>;
  nameById: Record<string, string>;
  tournament: Tournament;
}) {
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-6 min-w-max pb-4">
        {roundNumbers.map((r) => (
          <div key={r} className="space-y-3 min-w-[15rem]">
            <div className="slug">
              ［ round {String(r).padStart(2, "0")} ］
            </div>
            <div className="flex flex-col gap-3">
              {rounds[r]
                .sort((a, b) => a.position - b.position)
                .map((t) => (
                  <div key={t.id} className="paper paper-deckle">
                    <MatchRow tm={t} nameById={nameById} tournament={tournament} compact />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchRow({
  tm,
  nameById,
  tournament,
  compact,
}: {
  tm: TM;
  nameById: Record<string, string>;
  tournament: Tournament;
  compact?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const side1Names = tm.side1_player_ids.map((id) => nameById[id] || "?");
  const side2Names = tm.side2_player_ids.map((id) => nameById[id] || "?");
  const ready = tm.side1_player_ids.length > 0 && tm.side2_player_ids.length > 0;
  const played = !!tm.match_id;

  async function record(winner: 1 | 2) {
    setError(null);
    setSubmitting(true);
    try {
      await recordMatch({
        client_uuid: uuidv4(),
        match_type: tournament.match_type,
        winning_side: winner,
        played_at: new Date().toISOString(),
        side1_player_ids: tm.side1_player_ids,
        side2_player_ids: tm.side2_player_ids,
        tournament_match_id: tm.id,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${compact ? "p-3" : "px-4 py-3"}`}>
      <SideRow names={side1Names} highlight={played && tm.winning_side === 1} />
      <div className="flex items-center justify-center gap-2 my-1.5">
        <span className="h-px flex-1 bg-paper-edge/30" />
        <span className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">vs</span>
        <span className="h-px flex-1 bg-paper-edge/30" />
      </div>
      <SideRow names={side2Names} highlight={played && tm.winning_side === 2} />

      {!played && ready && (
        <div className="flex gap-1 mt-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => record(1)}
            className="tt-press flex-1 text-xs border border-paper-edge/60 bg-paper-light text-ink px-2 py-1.5 hover:bg-accent hover:text-paper-light transition disabled:opacity-50"
          >
            S1 wins
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => record(2)}
            className="tt-press flex-1 text-xs border border-paper-edge/60 bg-paper-light text-ink px-2 py-1.5 hover:bg-accent hover:text-paper-light transition disabled:opacity-50"
          >
            S2 wins
          </button>
        </div>
      )}
      {!ready && !played && (
        <div className="text-[11px] text-ink-soft mt-2 italic">
          Awaiting prior round
        </div>
      )}
      {error && <p className="text-xs text-paper-edge mt-1">{error}</p>}
    </div>
  );
}

function SideRow({ names, highlight }: { names: string[]; highlight: boolean }) {
  return (
    <div
      className={`text-sm truncate ${
        highlight ? "display text-ink font-medium" : "text-ink-soft"
      } flex items-center gap-2`}
    >
      {highlight && <span aria-hidden className="inline-block h-1.5 w-1.5 bg-accent" />}
      {names.length === 0 ? <span className="text-ink-soft/60">—</span> : names.join(" / ")}
    </div>
  );
}

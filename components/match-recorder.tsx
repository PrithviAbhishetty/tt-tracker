"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { PlayerPicker } from "./player-picker";
import { recordMatch } from "@/lib/offline/sync";

interface Props {
  matchType: "singles" | "doubles";
}

export function MatchRecorder({ matchType }: Props) {
  const perSide = matchType === "doubles" ? 2 : 1;
  const router = useRouter();
  const [side1, setSide1] = useState<string[]>([]);
  const [side2, setSide2] = useState<string[]>([]);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const ready = side1.length === perSide && side2.length === perSide && winner !== null;

  async function submit() {
    if (!ready) return;
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const result = await recordMatch({
        client_uuid: uuidv4(),
        match_type: matchType,
        winning_side: winner!,
        played_at: new Date().toISOString(),
        side1_player_ids: side1,
        side2_player_ids: side2,
      });
      if (result === "synced") {
        setInfo("Recorded.");
        router.push("/");
        router.refresh();
      } else {
        setInfo("Saved offline. Will sync when you reconnect.");
        setSide1([]);
        setSide2([]);
        setWinner(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record");
    } finally {
      setSubmitting(false);
    }
  }

  const sideLabel = matchType === "doubles" ? "(2 players)" : "";

  return (
    <div className="space-y-5">
      <PlayerPicker
        label={`Side 1 ${sideLabel}`}
        selected={side1}
        onChange={setSide1}
        max={perSide}
        exclude={side2}
      />

      {/* "vs" ornament — sage hairline + brush dot + display "vs" */}
      <div className="flex items-center justify-center gap-3" aria-label="versus">
        <div className="h-px flex-1 bg-paper-edge/40" />
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <circle cx="5" cy="5" r="3" fill="var(--accent)" />
        </svg>
        <span className="display text-base text-ink-on-paper italic tracking-[0.3em] uppercase">vs</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
          <circle cx="5" cy="5" r="3" fill="var(--accent)" />
        </svg>
        <div className="h-px flex-1 bg-paper-edge/40" />
      </div>

      <PlayerPicker
        label={`Side 2 ${sideLabel}`}
        selected={side2}
        onChange={setSide2}
        max={perSide}
        exclude={side1}
      />

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-on-paper/70">
          Winner
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2].map((s) => {
            const isWinner = winner === s;
            const enabled = (s === 1 ? side1 : side2).length === perSide;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setWinner(s as 1 | 2)}
                disabled={!enabled}
                className={`tt-press border px-4 py-3 text-sm font-medium transition ${
                  isWinner
                    ? "border-accent-deep bg-accent text-paper-light"
                    : "border-paper-edge/50 bg-paper-light text-ink hover:bg-paper-light/80"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Side {s} wins
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!ready || submitting}
        className="tt-press w-full bg-accent text-paper-light py-3 text-sm font-medium hover:bg-accent-deep transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Save match"}
      </button>

      {error && <p className="text-sm text-paper-light bg-paper-edge/40 px-3 py-2">{error}</p>}
      {info && <p className="text-sm text-ink-on-paper/80">{info}</p>}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerRow } from "@/lib/types";
import { createPlayer, fetchPlayers } from "@/lib/offline/players-cache";

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
  max: number;
  exclude?: string[];
  label?: string;
}

export function PlayerPicker({ selected, onChange, max, exclude = [], label }: Props) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const data = await fetchPlayers();
    setPlayers(data);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => {
      if (exclude.includes(p.id) && !selected.includes(p.id)) return false;
      if (!q) return true;
      return p.display_name.toLowerCase().includes(q);
    });
  }, [players, query, exclude, selected]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < max) {
      onChange([...selected, id]);
    }
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = newName.trim();
    if (!name) return;
    try {
      const { player } = await createPlayer(name);
      setPlayers((prev) =>
        [...prev, player].sort((a, b) => a.display_name.localeCompare(b.display_name)),
      );
      setNewName("");
      setAdding(false);
      if (selected.length < max) onChange([...selected, player.id]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-on-paper/80">
          {label}
        </div>
      )}

      <div className="paper paper-deckle">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-paper-edge/40">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search players…"
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-soft/60"
          />
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="text-xs text-accent-deep hover:text-accent transition"
          >
            {adding ? "Cancel" : "+ Guest"}
          </button>
        </div>

        {adding && (
          <form onSubmit={addGuest} className="px-3 py-2 border-b border-paper-edge/40 flex gap-2">
            <input
              autoFocus
              type="text"
              required
              placeholder="Guest name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-paper-edge/50 bg-paper-light/60 px-2 py-1 text-sm text-ink outline-none focus:border-accent transition"
            />
            <button
              type="submit"
              className="tt-press bg-accent text-paper-light px-3 py-1 text-sm font-medium hover:bg-accent-deep transition"
            >
              Add
            </button>
          </form>
        )}
        {error && (
          <div className="px-3 py-1 text-xs text-paper-edge bg-paper-edge/10 border-b border-paper-edge/30">
            {error}
          </div>
        )}

        <ul className="max-h-64 overflow-y-auto divide-y divide-paper-edge/30">
          {filtered.length === 0 && (
            <li className="px-3 py-3 text-sm text-ink-soft">No players match.</li>
          )}
          {filtered.map((p) => {
            const isSelected = selected.includes(p.id);
            const disabled = !isSelected && selected.length >= max;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition ${
                    isSelected ? "bg-accent-soft" : "hover:bg-accent-soft/50"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`h-5 w-5 flex items-center justify-center border ${
                        isSelected ? "border-accent-deep bg-accent" : "border-paper-edge/60 bg-paper-light"
                      }`}
                      aria-hidden
                    >
                      {isSelected && (
                        <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden>
                          {/* Brush-stroke check, painted */}
                          <path
                            d="M2.5 8.5 q1.4 0.4 3 2.6 q4 -5.5 8 -7.4"
                            fill="none"
                            stroke="var(--paper-light)"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="truncate text-ink">{p.display_name}</span>
                    {!p.user_id && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-paper-edge/40 text-ink-soft">
                        guest
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-ink-soft mono">{p.elo_rating}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayerPicker } from "@/components/player-picker";

interface NewTournamentFormProps {
  groupId?: string | null;
  presetParticipants?: string[];
}

export function NewTournamentForm({
  groupId = null,
  presetParticipants = [],
}: NewTournamentFormProps = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"round_robin" | "single_elim">("round_robin");
  const [matchType, setMatchType] = useState<"singles" | "doubles">("singles");
  const [participants, setParticipants] = useState<string[]>(presetParticipants);
  const [teams, setTeams] = useState<{ a: string; b: string }[]>([]); // doubles: pre-formed teams
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minParticipants = matchType === "singles" ? 3 : 2;
  const isDoubles = matchType === "doubles";
  const enoughParticipants = isDoubles ? teams.length >= minParticipants : participants.length >= minParticipants;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        name: name.trim() || `${format === "round_robin" ? "Round-robin" : "Bracket"} ${new Date().toLocaleDateString()}`,
        format,
        match_type: matchType,
        participants: isDoubles
          ? teams.map((t, i) => ({ team_label: `T${i + 1}`, player_ids: [t.a, t.b] }))
          : participants.map((id) => ({ team_label: null, player_ids: [id] })),
        group_id: groupId,
      };
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.push(`/tournaments/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tournament name (optional)"
        className="w-full border border-paper-edge/60 bg-paper-light/60 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:bg-paper-light outline-none transition"
      />

      <div className="grid grid-cols-2 gap-3">
        <SegmentedToggle
          label="Format"
          value={format}
          onChange={(v) => setFormat(v as "round_robin" | "single_elim")}
          options={[
            { value: "round_robin", label: "Round-robin" },
            { value: "single_elim", label: "Bracket" },
          ]}
        />
        <SegmentedToggle
          label="Type"
          value={matchType}
          onChange={(v) => {
            setMatchType(v as "singles" | "doubles");
            setParticipants([]);
            setTeams([]);
          }}
          options={[
            { value: "singles", label: "Singles" },
            { value: "doubles", label: "Doubles" },
          ]}
        />
      </div>

      {!isDoubles ? (
        <PlayerPicker
          label={`Participants (min ${minParticipants})`}
          selected={participants}
          onChange={setParticipants}
          max={32}
        />
      ) : (
        <DoublesTeamBuilder teams={teams} onChange={setTeams} />
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!enoughParticipants || submitting}
        className="tt-press w-full bg-accent text-paper-light py-3 text-sm font-medium hover:bg-accent-deep transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Creating…" : "Create tournament"}
      </button>
      {error && <p className="text-sm text-paper-edge">{error}</p>}
    </div>
  );
}

function SegmentedToggle({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-soft mb-1">{label}</div>
      <div className="flex border border-paper-edge/60">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 px-3 py-2 text-sm transition ${
              value === o.value
                ? "bg-accent text-paper-light"
                : "bg-paper-light text-ink hover:bg-paper-light/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DoublesTeamBuilder({
  teams,
  onChange,
}: {
  teams: { a: string; b: string }[];
  onChange: (t: { a: string; b: string }[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>([]);
  const usedIds = teams.flatMap((t) => [t.a, t.b]);

  function addTeam() {
    if (draft.length === 2) {
      onChange([...teams, { a: draft[0], b: draft[1] }]);
      setDraft([]);
    }
  }

  function removeTeam(i: number) {
    onChange(teams.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">
        Teams ({teams.length} added — min 2)
      </div>
      {teams.length > 0 && (
        <ul className="border border-paper-edge/60 divide-y divide-paper-edge/40">
          {teams.map((t, i) => (
            <li key={i} className="px-3 py-2 text-sm flex justify-between items-center text-ink">
              <span>
                <span className="display text-accent mr-2 mono">{String(i + 1).padStart(2, "0")}</span>
                Team · {t.a.slice(0, 6)} / {t.b.slice(0, 6)}
              </span>
              <button
                type="button"
                onClick={() => removeTeam(i)}
                className="text-xs text-paper-edge hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <PlayerPicker
        label="Pick 2 players for next team"
        selected={draft}
        onChange={setDraft}
        max={2}
        exclude={usedIds}
      />
      <button
        type="button"
        onClick={addTeam}
        disabled={draft.length !== 2}
        className="tt-press w-full border border-paper-edge/60 bg-paper-light text-ink py-2 text-sm hover:bg-paper-light/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add team
      </button>
    </div>
  );
}

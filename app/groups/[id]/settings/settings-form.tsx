"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayerPicker } from "@/components/player-picker";

interface MemberRow {
  player_id: string;
  display_name: string;
  role: "owner" | "member";
  is_self: boolean;
}

interface Props {
  groupId: string;
  initialName: string;
  members: MemberRow[];
}

export function GroupSettings({ groupId, initialName, members }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string[]>([]);

  function rename(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed");
        return;
      }
      router.refresh();
    });
  }

  function addMember() {
    if (draft.length === 0) return;
    setError(null);
    startTransition(async () => {
      for (const playerId of draft) {
        const res = await fetch(`/api/groups/${groupId}/members`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ player_id: playerId, role: "member" }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(d.error || "Failed");
          return;
        }
      }
      setDraft([]);
      router.refresh();
    });
  }

  function removeMember(playerId: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/groups/${groupId}/members?player_id=${encodeURIComponent(playerId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed");
        return;
      }
      router.refresh();
    });
  }

  function changeRole(playerId: string, role: "owner" | "member") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ player_id: playerId, role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed");
        return;
      }
      router.refresh();
    });
  }

  function deleteGroup() {
    if (!confirm("Delete this group? Tournaments stay; only the group is removed.")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed");
        return;
      }
      router.push("/groups");
      router.refresh();
    });
  }

  const memberIds = members.map((m) => m.player_id);

  return (
    <div className="space-y-6">
      <section className="paper paper-deckle px-5 py-5 space-y-3">
        <p className="slug-on-paper">［ name ］</p>
        <form onSubmit={rename} className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="flex-1 border border-paper-edge/60 bg-paper-light/60 px-3 py-2 text-sm text-ink focus:border-accent focus:bg-paper-light outline-none transition"
          />
          <button
            type="submit"
            disabled={pending || name.trim() === initialName || !name.trim()}
            className="tt-press bg-accent text-paper-light px-4 py-2 text-sm font-medium hover:bg-accent-deep transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </form>
      </section>

      <section className="paper paper-deckle px-5 py-5 space-y-4">
        <p className="slug-on-paper">［ members ］</p>
        <ul className="divide-y divide-paper-edge/40">
          {members.map((m) => (
            <li key={m.player_id} className="py-2 flex items-center gap-3 text-sm">
              <span className="flex-1 truncate text-ink">
                {m.display_name}
                {m.is_self && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-soft">
                    you
                  </span>
                )}
              </span>
              <select
                value={m.role}
                onChange={(e) => changeRole(m.player_id, e.target.value as "owner" | "member")}
                disabled={pending}
                className="border border-paper-edge/60 bg-paper-light px-2 py-1 text-xs text-ink"
              >
                <option value="member">member</option>
                <option value="owner">owner</option>
              </select>
              <button
                type="button"
                onClick={() => removeMember(m.player_id)}
                disabled={pending}
                className="text-xs text-paper-edge hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <p className="slug-on-paper">［ add members ］</p>
          <PlayerPicker
            label="Pick players to add"
            selected={draft}
            onChange={setDraft}
            max={32}
            exclude={memberIds}
          />
          <button
            type="button"
            onClick={addMember}
            disabled={pending || draft.length === 0}
            className="tt-press w-full border border-paper-edge/60 bg-paper-light text-ink py-2 text-sm hover:bg-paper-light/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add {draft.length || ""}
          </button>
        </div>
      </section>

      <section className="paper paper-deckle px-5 py-5 space-y-3 border-l-4 border-paper-edge">
        <p className="slug-on-paper">［ danger ］</p>
        <p className="text-sm text-ink-soft">
          Deleting removes the group and its membership list. Matches and tournaments are kept (tournaments simply lose their group link).
        </p>
        <button
          type="button"
          onClick={deleteGroup}
          disabled={pending}
          className="tt-press bg-paper-edge text-paper-light px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          Delete group
        </button>
      </section>

      {error && <p className="text-sm text-paper-edge">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { wipeAllData, wipeUserAndAuth, wipeUserData } from "./actions";

interface AdminUserRow {
  user_id: string | null;
  email: string;
  display_name: string;
  player_id: string | null;
  is_active: boolean;
  matches_recorded: number;
  tournaments_created: number;
  groups_created: number;
}

export function AdminConsole({ users }: { users: AdminUserRow[] }) {
  return (
    <div className="space-y-7">
      <NukeAll />
      <section className="space-y-3">
        <p className="slug">［ users ］</p>
        <ul className="paper paper-deckle divide-y divide-paper-edge/40">
          {users.map((u) => (
            <UserRow key={u.user_id ?? u.email} user={u} />
          ))}
          {users.length === 0 && (
            <li className="px-4 py-4 text-sm text-ink-soft">No users.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function UserRow({ user }: { user: AdminUserRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [dataConfirm, setDataConfirm] = useState("");
  const [authConfirm, setAuthConfirm] = useState("");

  const dataReady = dataConfirm.trim().toLowerCase() === user.email.toLowerCase();
  const authReady = authConfirm.trim() === `DELETE ${user.email}`;

  function doWipeData() {
    if (!dataReady || !user.user_id) return;
    setError(null);
    startTransition(async () => {
      try {
        await wipeUserData(user.user_id!);
        setDataConfirm("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function doWipeAuth() {
    if (!authReady || !user.user_id) return;
    setError(null);
    startTransition(async () => {
      try {
        await wipeUserAndAuth(user.user_id!);
        setAuthConfirm("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <li className="px-4 py-3 text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="display text-ink truncate">{user.display_name}</div>
          <div className="text-xs text-ink-soft mono truncate">{user.email}</div>
        </div>
        <div className="text-xs text-ink-soft text-right">
          <div>
            {user.matches_recorded}m · {user.tournaments_created}t · {user.groups_created}g
          </div>
          {!user.is_active && (
            <div className="text-[10px] uppercase tracking-wider mt-0.5 text-paper-edge">
              deactivated
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-paper-edge/40 pt-3">
          <div className="space-y-1">
            <p className="text-xs text-ink-soft">
              Wipe data — type <span className="mono text-ink">{user.email}</span>
            </p>
            <div className="flex gap-2">
              <input
                value={dataConfirm}
                onChange={(e) => setDataConfirm(e.target.value)}
                placeholder={user.email}
                className="flex-1 border border-paper-edge/60 bg-paper-light/60 px-2 py-1 text-xs text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={!dataReady || pending || !user.user_id}
                onClick={doWipeData}
                className="tt-press bg-paper-edge text-paper-light px-3 py-1 text-xs hover:opacity-90 transition disabled:opacity-40"
              >
                Wipe data
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-ink-soft">
              Wipe data + delete auth user — type{" "}
              <span className="mono text-ink">DELETE {user.email}</span>
            </p>
            <div className="flex gap-2">
              <input
                value={authConfirm}
                onChange={(e) => setAuthConfirm(e.target.value)}
                placeholder={`DELETE ${user.email}`}
                className="flex-1 border border-paper-edge/60 bg-paper-light/60 px-2 py-1 text-xs text-ink outline-none focus:border-accent"
              />
              <button
                type="button"
                disabled={!authReady || pending || !user.user_id}
                onClick={doWipeAuth}
                className="tt-press bg-paper-edge text-paper-light px-3 py-1 text-xs hover:opacity-90 transition disabled:opacity-40"
              >
                Wipe + delete
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-paper-edge">{error}</p>}
        </div>
      )}
    </li>
  );
}

function NukeAll() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ready = confirm === "WIPE ALL DATA";

  function go() {
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      try {
        await wipeAllData();
        setConfirm("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <section className="paper paper-deckle px-5 py-5 space-y-3 border-l-4 border-paper-edge">
      <p className="slug-on-paper">［ wipe entire app ］</p>
      <p className="text-sm text-ink-soft">
        Truncates every match, tournament, and group, and resets all ELO ratings to 1200. Player
        names are kept; auth users are NOT deleted.
      </p>
      <div className="flex gap-2">
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="WIPE ALL DATA"
          className="flex-1 border border-paper-edge/60 bg-paper-light/60 px-3 py-2 text-sm text-ink outline-none focus:border-accent transition"
        />
        <button
          type="button"
          disabled={!ready || pending}
          onClick={go}
          className="tt-press bg-paper-edge text-paper-light px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "…" : "Wipe everything"}
        </button>
      </div>
      {error && <p className="text-sm text-paper-edge">{error}</p>}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { deactivateSelf } from "./actions";

export function DeactivateForm({ email }: { email: string }) {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = confirm.trim().toLowerCase() === email.toLowerCase();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setError(null);
    startTransition(async () => {
      try {
        await deactivateSelf();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-xs text-ink-soft">
        Type your email to confirm: <span className="mono text-ink">{email}</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={email}
          className="min-w-0 flex-1 border border-paper-edge/60 bg-paper-light/60 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:bg-paper-light outline-none transition"
        />
        <button
          type="submit"
          disabled={!ready || pending}
          className="tt-press bg-paper-edge text-paper-light px-4 py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "…" : "Deactivate"}
        </button>
      </div>
      {error && <p className="text-sm text-paper-edge">{error}</p>}
    </form>
  );
}

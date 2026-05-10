"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      router.push(`/groups/${data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">New group</div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Tuesday Crew"
          maxLength={80}
          className="min-w-0 flex-1 border border-paper-edge/60 bg-paper-light/60 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent focus:bg-paper-light outline-none transition"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="tt-press bg-accent text-paper-light px-4 py-2 text-sm font-medium hover:bg-accent-deep transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
      {error && <p className="text-sm text-paper-edge">{error}</p>}
    </form>
  );
}

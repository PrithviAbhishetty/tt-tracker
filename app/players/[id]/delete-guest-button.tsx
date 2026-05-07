"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteGuestButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    if (!confirm(`Delete guest "${playerName}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/players/${playerId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed");
        return;
      }
      router.push("/players");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="text-[11px] uppercase tracking-wider text-paper-edge hover:underline disabled:opacity-50"
      >
        {pending ? "deleting…" : "delete"}
      </button>
      {error && <span className="text-xs text-paper-edge">{error}</span>}
    </>
  );
}

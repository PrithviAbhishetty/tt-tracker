import { Leaderboard } from "@/components/leaderboard";

export default function LeaderboardPage() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ".");
  return (
    <div className="space-y-7">
      <div className="tt-rise">
        <div className="flex items-center gap-3 text-ink-on-paper/80 text-[10px] uppercase tracking-[0.3em]">
          <span>［ ledger no.07 ］</span>
          <span className="h-px flex-1 bg-ink-on-paper/30" />
          <span className="mono">{today}</span>
        </div>
        <h1 className="display text-5xl sm:text-6xl tracking-tight text-ink-on-paper mt-3 leading-none">
          Rankings
        </h1>
        <p className="text-ink-on-paper/70 mt-2 text-sm">
          Compiled from match logs · ELO seeded at 1200 · K tiered 40/32/16
        </p>
      </div>
      <Leaderboard />
    </div>
  );
}

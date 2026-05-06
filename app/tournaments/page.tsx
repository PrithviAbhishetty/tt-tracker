import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Hanko } from "@/components/decor/hanko";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, name, format, match_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 tt-rise">
        <div>
          <p className="slug">［ /tournaments ］</p>
          <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
            Tournaments
          </h1>
        </div>
        <Link
          href="/tournaments/new"
          className="tt-press bg-accent text-paper-light px-3.5 py-2 text-sm font-medium hover:bg-accent-deep transition"
        >
          + New
        </Link>
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <p className="text-sm text-ink-on-paper/70">No tournaments yet.</p>
      ) : (
        <ul className="space-y-3">
          {tournaments.map((t, i) => (
            <li
              key={t.id}
              className="tt-rise"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <Link
                href={`/tournaments/${t.id}`}
                className="paper paper-deckle relative flex items-center gap-4 px-4 py-3 hover:bg-paper-light/85 transition group"
              >
                <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 bg-accent" />
                <div className="ml-2 shrink-0">
                  <Hanko
                    kanji={t.format === "round_robin" ? "輪" : "札"}
                    size={42}
                    rotate={-6}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="display text-lg text-ink leading-tight truncate">
                    {t.name}
                  </div>
                  <div className="text-xs text-ink-soft mt-0.5">
                    {t.format === "round_robin" ? "Round-robin" : "Single elimination"} ·{" "}
                    {t.match_type}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 ${
                    t.status === "completed"
                      ? "bg-paper-edge/30 text-ink"
                      : t.status === "in_progress"
                      ? "bg-accent text-paper-light"
                      : "border border-paper-edge/50 text-ink-soft"
                  }`}
                >
                  {t.status.replace("_", " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

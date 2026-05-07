import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hanko } from "@/components/decor/hanko";
import {
  fetchGroupLeaderboard,
  fetchGroupMatches,
  fetchGroupMembers,
} from "@/lib/groups/scoped";

export const dynamic = "force-dynamic";

export default async function GroupHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/groups/${id}`);

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, slug, created_by, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  const [members, leaderboard, matches, { data: tournaments }] = await Promise.all([
    fetchGroupMembers(id),
    fetchGroupLeaderboard(id),
    fetchGroupMatches(id, 10),
    supabase
      .from("tournaments")
      .select("id, name, format, match_type, status, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const myPlayer = members.find((m) => m.player.user_id === user.id);
  const isOwner = myPlayer?.role === "owner";
  const nameById = new Map(members.map((m) => [m.player.id, m.player.display_name]));

  return (
    <div className="space-y-7">
      <div className="paper paper-deckle relative px-5 py-5 sm:py-6 tt-pop">
        <div className="absolute -top-4 right-4">
          <Hanko kanji="友" size={48} rotate={-7} />
        </div>
        <p className="slug-on-paper">［ group ］</p>
        <h1 className="display text-3xl text-ink mt-1 leading-tight truncate">{group.name}</h1>
        <p className="text-xs text-ink-soft mt-1.5 uppercase tracking-[0.18em]">
          {members.length} member{members.length === 1 ? "" : "s"} · {matches.length} recent match
          {matches.length === 1 ? "" : "es"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/tournaments/new?group=${group.id}`}
            className="tt-press bg-accent text-paper-light px-3 py-1.5 text-sm font-medium hover:bg-accent-deep transition"
          >
            + New tournament
          </Link>
          {isOwner && (
            <Link
              href={`/groups/${group.id}/settings`}
              className="tt-press border border-paper-edge/60 bg-paper-light text-ink px-3 py-1.5 text-sm hover:bg-paper-light/70 transition"
            >
              Settings
            </Link>
          )}
        </div>
      </div>

      <section className="space-y-3">
        <p className="slug">［ standings ］</p>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-ink-on-paper/70">No members yet.</p>
        ) : (
          <ol className="paper paper-deckle divide-y divide-paper-edge/40">
            {leaderboard.map((p, i) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3">
                <span className="display text-accent w-8 mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 truncate text-ink">{p.display_name}</span>
                <span className="text-xs text-ink-soft mr-3">{p.games_played} GP</span>
                <span className="display tnum text-ink">{p.elo_rating}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <p className="slug">［ tournaments ］</p>
          <Link
            href={`/tournaments/new?group=${group.id}`}
            className="text-xs text-accent-deep hover:text-accent transition"
          >
            + new
          </Link>
        </div>
        {!tournaments || tournaments.length === 0 ? (
          <p className="text-sm text-ink-on-paper/70">No tournaments yet for this group.</p>
        ) : (
          <ul className="space-y-2">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tournaments/${t.id}`}
                  className="paper paper-deckle flex items-center gap-3 px-3 py-2 hover:bg-paper-light/85 transition"
                >
                  <Hanko kanji={t.format === "round_robin" ? "輪" : "札"} size={32} rotate={-4} />
                  <div className="min-w-0 flex-1">
                    <div className="display text-base text-ink leading-tight truncate">{t.name}</div>
                    <div className="text-xs text-ink-soft mt-0.5">
                      {t.format === "round_robin" ? "Round-robin" : "Bracket"} · {t.match_type}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 ${
                      t.status === "completed"
                        ? "bg-paper-edge/30 text-ink"
                        : "bg-accent text-paper-light"
                    }`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <p className="slug">［ recent matches ］</p>
        {matches.length === 0 ? (
          <p className="text-sm text-ink-on-paper/70">
            No matches between these members yet. Record one and it will show up here.
          </p>
        ) : (
          <ul className="paper paper-deckle divide-y divide-paper-edge/40">
            {matches.map((m) => {
              const s1 = m.side1.map((id) => nameById.get(id) ?? "?").join(" / ");
              const s2 = m.side2.map((id) => nameById.get(id) ?? "?").join(" / ");
              const winner = m.winning_side === 1 ? s1 : s2;
              const loser = m.winning_side === 1 ? s2 : s1;
              return (
                <li key={m.id} className="px-4 py-3 text-sm flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink-soft mono w-20">
                    {new Date(m.played_at).toLocaleDateString()}
                  </span>
                  <span className="flex-1 text-ink truncate">
                    <span className="display text-accent-deep">{winner}</span>
                    <span className="text-ink-soft mx-2">def.</span>
                    {loser}
                  </span>
                  {!m.rated && (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-paper-edge/40 text-ink-soft">
                      unrated
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Hanko } from "@/components/decor/hanko";
import { CreateGroupForm } from "./create-form";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/groups");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 tt-rise">
        <div>
          <p className="slug">［ /groups ］</p>
          <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
            Groups
          </h1>
          <p className="text-ink-on-paper/70 mt-2 text-sm">
            Friends who play together. Scoped leaderboards · easy tournament setup.
          </p>
        </div>
      </div>

      <div className="paper paper-deckle px-5 py-5 tt-pop">
        <CreateGroupForm />
      </div>

      {!groups || groups.length === 0 ? (
        <div className="paper paper-deckle p-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-3 text-ink-soft text-[11px] uppercase tracking-[0.3em]">
            <span className="h-px w-6 bg-paper-edge/60" />
            no groups yet
            <span className="h-px w-6 bg-paper-edge/60" />
          </div>
          <p className="text-sm text-ink-soft">
            Make one above and add the people you play with.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((g, i) => (
            <li
              key={g.id}
              className="tt-rise"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <Link
                href={`/groups/${g.id}`}
                className="paper paper-deckle relative flex items-center gap-4 px-4 py-3 hover:bg-paper-light/85 transition"
              >
                <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 bg-accent" />
                <div className="ml-2 shrink-0">
                  <Hanko kanji="友" size={42} rotate={-6} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="display text-lg text-ink leading-tight truncate">{g.name}</div>
                  <div className="text-xs text-ink-soft mt-0.5 mono">{g.slug}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

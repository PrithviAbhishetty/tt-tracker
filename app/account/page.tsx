import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { DeactivateForm } from "./deactivate-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const { data: player } = await supabase
    .from("players")
    .select("id, display_name, elo_rating, games_played, is_active, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = isAdminEmail(user.email);

  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /account ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          Account
        </h1>
      </div>

      <section className="paper paper-deckle px-5 py-5 space-y-3 tt-pop">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="display name" value={player?.display_name ?? "—"} />
          <Field label="email" value={user.email ?? "—"} />
          <Field label="elo" value={String(player?.elo_rating ?? 1200)} />
          <Field label="games" value={String(player?.games_played ?? 0)} />
          <Field
            label="status"
            value={player?.is_active === false ? "deactivated" : "active"}
          />
          <Field
            label="member since"
            value={
              player?.created_at
                ? new Date(player.created_at).toISOString().slice(0, 10)
                : "—"
            }
          />
        </div>
      </section>

      {isAdmin && (
        <section className="paper paper-deckle px-5 py-5 space-y-2">
          <p className="slug-on-paper">［ admin ］</p>
          <p className="text-sm text-ink-soft">
            You have administrator access. Use with care.
          </p>
          <Link
            href="/admin"
            className="tt-press inline-block bg-accent text-paper-light px-4 py-2 text-sm font-medium hover:bg-accent-deep transition"
          >
            Open admin console
          </Link>
        </section>
      )}

      <section className="paper paper-deckle px-5 py-5 space-y-3 border-l-4 border-paper-edge">
        <p className="slug-on-paper">［ deactivate ］</p>
        <p className="text-sm text-ink-soft">
          Hides your profile from the active leaderboard. Your matches and ELO history are kept for analytics. You can re-activate by contacting an admin.
        </p>
        <DeactivateForm email={user.email ?? ""} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-soft">{label}</div>
      <div className="text-ink mt-0.5 truncate">{value}</div>
    </div>
  );
}

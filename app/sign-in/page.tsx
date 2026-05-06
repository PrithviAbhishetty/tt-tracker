import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(params.next || "/");

  return (
    <div className="max-w-sm mx-auto mt-6 sm:mt-12 tt-fade">
      {/* Editorial slug */}
      <div className="text-center mb-5">
        <div className="text-ink-on-paper/80 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]">
          <span className="h-px w-10 bg-ink-on-paper/40" />
          <span>table tennis</span>
          <span className="h-px w-10 bg-ink-on-paper/40" />
        </div>
      </div>

      {/* Parchment card */}
      <div className="paper paper-deckle rounded-none px-6 py-7 tt-pop relative">
        <div className="space-y-1.5 mb-5">
          <p className="slug-on-paper">［ entry №01 ］</p>
          <h1 className="display text-3xl tracking-tight text-ink leading-none">
            Welcome.
          </h1>
          <p className="text-sm text-ink-soft">
            Authenticate to record matches and view standings.
          </p>
        </div>

        {params.error && (
          <div className="mb-4 border-l-2 border-paper-edge bg-paper-edge/10 px-3 py-2 text-sm text-ink">
            {params.error}
          </div>
        )}

        <SignInForm next={params.next} />
      </div>

      <div className="mt-6 flex items-center justify-center gap-3 text-[10px] text-ink-on-paper/70 uppercase tracking-[0.2em]">
        <span className="mono">v0.1</span>
        <span>·</span>
        <span>elo k=40/32/16</span>
      </div>
    </div>
  );
}

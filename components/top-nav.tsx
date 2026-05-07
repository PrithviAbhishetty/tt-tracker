import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import { InstallPrompt } from "./install-prompt";
import { PaddleMark } from "./decor/paddle-mark";

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="relative z-30 border-b border-paper-edge/40">
      <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-ink-on-paper">
          <PaddleMark size={26} />
          <span className="display text-base tracking-tight">TT Tracker</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm text-ink-on-paper">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <NavLink href="/record">Record</NavLink>
                <NavLink href="/players">Players</NavLink>
                <NavLink href="/groups">Groups</NavLink>
                <NavLink href="/tournaments">Tourneys</NavLink>
                <NavLink href="/account">Account</NavLink>
                <InstallPrompt />
                <SignOutButton />
              </div>
              <details className="sm:hidden relative">
                <summary className="list-none cursor-pointer select-none px-2 py-1 text-ink-on-paper [&::-webkit-details-marker]:hidden">
                  <span className="inline-block w-5 h-[2px] bg-current relative before:content-[''] before:absolute before:inset-0 before:-translate-y-[6px] before:bg-current after:content-[''] after:absolute after:inset-0 after:translate-y-[6px] after:bg-current" />
                  <span className="sr-only">Menu</span>
                </summary>
                <div className="absolute right-0 mt-2 paper paper-deckle py-2 px-3 min-w-[10rem] z-40 flex flex-col gap-2.5">
                  <NavLink href="/record">Record</NavLink>
                  <NavLink href="/players">Players</NavLink>
                  <NavLink href="/groups">Groups</NavLink>
                  <NavLink href="/tournaments">Tourneys</NavLink>
                  <NavLink href="/account">Account</NavLink>
                  <div className="border-t border-paper-edge/40 pt-2 mt-1 flex items-center gap-3">
                    <InstallPrompt />
                    <SignOutButton />
                  </div>
                </div>
              </details>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative pb-0.5 text-ink-on-paper/85 hover:text-ink-on-paper transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-ink-on-paper after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
    >
      {children}
    </Link>
  );
}

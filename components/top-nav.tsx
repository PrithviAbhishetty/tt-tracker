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
              <NavLink href="/record">Record</NavLink>
              <NavLink href="/players">Players</NavLink>
              <NavLink href="/tournaments">Tourneys</NavLink>
              <InstallPrompt />
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              className="tt-press px-3 py-1.5 bg-accent text-paper-light text-sm font-medium hover:bg-accent-deep transition"
            >
              Sign in
            </Link>
          )}
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

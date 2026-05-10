"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/record", label: "Record" },
  { href: "/players", label: "Players" },
  { href: "/groups", label: "Groups" },
  { href: "/tournaments", label: "Tourneys" },
  { href: "/account", label: "Account" },
];

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="sm:hidden relative">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer select-none px-2 py-1 text-ink-on-paper"
      >
        <span className="inline-block w-5 h-[2px] bg-current relative before:content-[''] before:absolute before:inset-0 before:-translate-y-[6px] before:bg-current after:content-[''] after:absolute after:inset-0 after:translate-y-[6px] after:bg-current" />
        <span className="sr-only">Menu</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            ref={panelRef}
            role="menu"
            className="absolute right-0 mt-2 paper paper-deckle py-2 px-3 min-w-[12rem] z-40 flex flex-col gap-2.5 text-ink"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="self-end -mr-1 -mt-0.5 px-2 py-0.5 text-ink/70 hover:text-ink text-base leading-none cursor-pointer"
            >
              ✕
            </button>
            {LINKS.map(({ href, label }) => (
              <MobileNavLink key={href} href={href} onNavigate={() => setOpen(false)}>
                {label}
              </MobileNavLink>
            ))}
            <div className="border-t border-paper-edge/40 pt-2 mt-1 flex items-center gap-3">
              {children}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MobileNavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="relative pb-0.5 text-ink/85 hover:text-ink transition-colors after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-ink after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
    >
      {children}
    </Link>
  );
}

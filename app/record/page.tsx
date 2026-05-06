import Link from "next/link";
import { Tilt } from "@/components/decor/tilt";
import { PaddleMark } from "@/components/decor/paddle-mark";

export default function RecordChooser() {
  return (
    <div className="space-y-7">
      <div className="tt-rise">
        <p className="slug">［ /record ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          New match
        </h1>
        <p className="text-ink-on-paper/70 text-sm mt-2">
          Choose the format. Both feed the ELO ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormatCard
          href="/record/singles"
          title="Singles"
          subtitle="1 v 1 · win or loss"
          mark="01"
          delay="80ms"
        />
        <FormatCard
          href="/record/doubles"
          title="Doubles"
          subtitle="2 v 2 · team rating averaged"
          mark="02"
          delay="160ms"
        />
      </div>

      <p className="text-xs text-ink-on-paper/60 tt-rise" style={{ animationDelay: "240ms" }}>
        Tournament play? Open the bracket — those results count toward ELO too.
      </p>
    </div>
  );
}

function FormatCard({
  href,
  title,
  subtitle,
  mark,
  delay,
}: {
  href: string;
  title: string;
  subtitle: string;
  mark: string;
  delay: string;
}) {
  return (
    <Tilt className="tt-pop" max={5}>
      <Link
        href={href}
        style={{ animationDelay: delay }}
        className="paper paper-deckle group relative block px-5 py-6 hover:bg-paper-light/85 transition"
      >
        {/* Sage vertical rule on right */}
        <span aria-hidden className="absolute right-0 top-6 bottom-6 w-px bg-accent" />

        <div className="flex items-start gap-4">
          <div className="text-ink shrink-0">
            <PaddleMark size={36} />
          </div>
          <div className="min-w-0">
            <div className="brush text-2xl text-ink leading-tight">{title}</div>
            <div className="text-sm text-ink-soft mt-0.5">{subtitle}</div>
          </div>
          <div className="ml-auto display text-3xl text-accent">{mark}</div>
        </div>
        <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-ink-soft flex items-center gap-2">
          <span>begin</span>
          <span aria-hidden className="h-px w-6 bg-paper-edge/40 group-hover:w-10 transition-all" />
          <span aria-hidden>→</span>
        </div>
      </Link>
    </Tilt>
  );
}

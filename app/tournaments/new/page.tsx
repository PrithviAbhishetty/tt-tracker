import { NewTournamentForm } from "./new-form";

export default function NewTournamentPage() {
  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /tournaments/new ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          New tournament
        </h1>
      </div>
      <div className="paper paper-deckle px-5 py-6 tt-pop">
        <NewTournamentForm />
      </div>
    </div>
  );
}

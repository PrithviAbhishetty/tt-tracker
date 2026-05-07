import { PlayersList } from "@/components/players-list";

export default function PlayersListPage() {
  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /players ］</p>
        <h1 className="display text-4xl text-ink-on-paper tracking-tight mt-2 leading-none">
          Roster
        </h1>
      </div>
      <PlayersList />
    </div>
  );
}

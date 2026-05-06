import { MatchRecorder } from "@/components/match-recorder";

export default function RecordSinglesPage() {
  return (
    <div className="space-y-6">
      <div className="tt-rise">
        <p className="slug">［ /record/singles ］</p>
        <h1 className="display text-3xl text-ink-on-paper tracking-tight mt-2 leading-none">
          Singles
        </h1>
      </div>
      <MatchRecorder matchType="singles" />
    </div>
  );
}

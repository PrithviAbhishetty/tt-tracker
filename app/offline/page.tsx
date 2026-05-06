export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="text-center py-16 space-y-3">
      <h1 className="text-xl font-semibold">You're offline</h1>
      <p className="text-sm text-muted-foreground">
        Matches you record will be saved locally and synced when you reconnect.
      </p>
    </div>
  );
}

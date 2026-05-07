-- Backfill: mark fully-played tournaments as completed.
-- API logic from this point forward maintains tournaments.status going forward;
-- this one-shot picks up tournaments that were stuck before the fix landed.

update public.tournaments t
set status = 'completed',
    completed_at = coalesce(t.completed_at, now())
where t.status <> 'completed'
  and exists (select 1 from public.tournament_matches tm where tm.tournament_id = t.id)
  and not exists (
    select 1 from public.tournament_matches tm
    where tm.tournament_id = t.id and tm.match_id is null
  );

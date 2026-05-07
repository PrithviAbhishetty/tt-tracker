-- Factory reset: nukes every user-data table including players. Auth users
-- are deleted from the API route via the service role admin API; that part
-- can't be done in SQL.

create or replace function public.admin_factory_reset_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate
    public.match_elo_snapshots,
    public.match_players,
    public.tournament_matches,
    public.tournament_participants,
    public.matches,
    public.tournaments,
    public.group_members,
    public.groups,
    public.players
  restart identity cascade;
end;
$$;

revoke all on function public.admin_factory_reset_data() from public, anon, authenticated;
grant execute on function public.admin_factory_reset_data() to service_role;

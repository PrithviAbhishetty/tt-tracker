-- Admin reset RPCs. Callers must hold the service role; server-side admin
-- gate is enforced in the Next.js route. Functions are SECURITY DEFINER so
-- they own all the cascading deletes regardless of caller.

create or replace function public.admin_wipe_all()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Supabase blocks unrestricted DELETE by default, so use a single TRUNCATE
  -- CASCADE that covers everything user-data-related in one shot.
  truncate
    public.match_elo_snapshots,
    public.match_players,
    public.tournament_matches,
    public.tournament_participants,
    public.matches,
    public.tournaments,
    public.group_members,
    public.groups
  restart identity cascade;

  update public.players
     set elo_rating = 1200,
         games_played = 0
   where true;
end;
$$;

revoke all on function public.admin_wipe_all() from public, anon, authenticated;
grant execute on function public.admin_wipe_all() to service_role;

create or replace function public.admin_wipe_user_data(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.matches where recorded_by = p_user_id;
  delete from public.tournaments where created_by = p_user_id;
  delete from public.groups where created_by = p_user_id;

  delete from public.group_members gm
   using public.players p
   where gm.player_id = p.id and p.user_id = p_user_id;

  update public.players
     set is_active = false,
         elo_rating = 1200,
         games_played = 0
   where user_id = p_user_id;
end;
$$;

revoke all on function public.admin_wipe_user_data(uuid) from public, anon, authenticated;
grant execute on function public.admin_wipe_user_data(uuid) to service_role;

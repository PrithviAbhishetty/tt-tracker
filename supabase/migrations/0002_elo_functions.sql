-- ELO calculation functions.
-- Standard ELO, win/loss only. Tiered K-factor.
-- Doubles: team rating = mean of partners; same delta applied to both teammates.

-- K-factor based on games played: 40 (<10), 32 (<30), 16 (otherwise)
create or replace function public.elo_k_factor(games_played int)
returns int
language sql
immutable
as $$
  select case
    when games_played < 10 then 40
    when games_played < 30 then 32
    else 16
  end;
$$;

-- Expected score for player A vs player B
create or replace function public.elo_expected(rating_a int, rating_b int)
returns double precision
language sql
immutable
as $$
  select 1.0 / (1.0 + power(10.0, (rating_b - rating_a) / 400.0));
$$;

-- Apply ELO update for a single match. Idempotent: if a snapshot already
-- exists for the match, it is a no-op. Updates players.elo_rating and
-- games_played, and writes match_elo_snapshots rows.
create or replace function public.apply_match_elo(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winning_side smallint;
  v_match_type text;
  v_side1_ids uuid[];
  v_side2_ids uuid[];
  v_side1_avg double precision;
  v_side2_avg double precision;
  v_min_games int;
  v_k int;
  v_e1 double precision;
  v_delta double precision;
  v_pid uuid;
begin
  -- Idempotency guard
  if exists (select 1 from match_elo_snapshots where match_id = p_match_id) then
    return;
  end if;

  select winning_side, match_type
    into v_winning_side, v_match_type
    from matches where id = p_match_id;

  if v_winning_side is null then
    raise exception 'match % not found', p_match_id;
  end if;

  select array_agg(player_id) into v_side1_ids
    from match_players where match_id = p_match_id and side = 1;
  select array_agg(player_id) into v_side2_ids
    from match_players where match_id = p_match_id and side = 2;

  -- Lock the player rows we are about to update to avoid concurrent recompute races
  perform 1 from players
    where id = any(v_side1_ids || v_side2_ids)
    for update;

  -- Team average ratings
  select avg(elo_rating)::double precision into v_side1_avg
    from players where id = any(v_side1_ids);
  select avg(elo_rating)::double precision into v_side2_avg
    from players where id = any(v_side2_ids);

  -- Use the lowest games_played among participants to set K
  -- (newer players settle faster regardless of which side they are on)
  select min(games_played) into v_min_games
    from players where id = any(v_side1_ids || v_side2_ids);

  v_k := elo_k_factor(v_min_games);

  -- Expected score for side 1
  v_e1 := 1.0 / (1.0 + power(10.0, (v_side2_avg - v_side1_avg) / 400.0));

  -- Delta for side-1 players (winner_score - expected)
  if v_winning_side = 1 then
    v_delta := v_k * (1.0 - v_e1);
  else
    v_delta := v_k * (0.0 - v_e1);
  end if;

  -- Apply to side 1 (gain delta) — round half away from zero
  foreach v_pid in array v_side1_ids loop
    insert into match_elo_snapshots (match_id, player_id, rating_before, rating_after)
    select p_match_id, v_pid, p.elo_rating, p.elo_rating + round(v_delta)::int
    from players p where p.id = v_pid;

    update players
      set elo_rating = elo_rating + round(v_delta)::int,
          games_played = games_played + 1
      where id = v_pid;
  end loop;

  -- Apply to side 2 (lose delta — symmetric)
  foreach v_pid in array v_side2_ids loop
    insert into match_elo_snapshots (match_id, player_id, rating_before, rating_after)
    select p_match_id, v_pid, p.elo_rating, p.elo_rating - round(v_delta)::int
    from players p where p.id = v_pid;

    update players
      set elo_rating = elo_rating - round(v_delta)::int,
          games_played = games_played + 1
      where id = v_pid;
  end loop;
end;
$$;

-- Full recompute: reset all players to 1200 / 0 games and replay every match
-- in chronological order. Safe to call any time (e.g. after a backdated insert
-- or admin cleanup). Wraps in a single transaction for atomicity.
create or replace function public.recalculate_all_elo()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
begin
  -- Clear derived state
  delete from match_elo_snapshots;
  update players set elo_rating = 1200, games_played = 0;

  -- Replay every match in chronological order
  for v_match in
    select id from matches order by played_at asc, created_at asc, id asc
  loop
    perform apply_match_elo(v_match.id);
  end loop;
end;
$$;

-- Recompute starting from a given timestamp forward. Used after a backdated
-- match arrives via offline sync: clear all snapshots from that point on,
-- restore player ratings to the pre-cutoff state, and replay forward.
create or replace function public.recalculate_elo_since(p_since timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match record;
  v_player record;
begin
  -- Affected players = anyone in a match at or after the cutoff
  create temporary table _affected_players (player_id uuid primary key) on commit drop;
  insert into _affected_players (player_id)
  select distinct mp.player_id
  from match_players mp
  join matches m on m.id = mp.match_id
  where m.played_at >= p_since;

  -- Restore each affected player to their state immediately before p_since:
  -- their rating equals the rating_after of their latest pre-cutoff match
  -- (or 1200 if no pre-cutoff matches), and games_played = count of pre-cutoff matches.
  for v_player in select player_id from _affected_players loop
    update players p
      set elo_rating = coalesce(
            (select s.rating_after
               from match_elo_snapshots s
               join matches m2 on m2.id = s.match_id
               where s.player_id = v_player.player_id
                 and m2.played_at < p_since
               order by m2.played_at desc, m2.created_at desc, m2.id desc
               limit 1),
            1200
          ),
          games_played = (
            select count(*)
              from match_players mp
              join matches m3 on m3.id = mp.match_id
              where mp.player_id = v_player.player_id
                and m3.played_at < p_since
          )
      where p.id = v_player.player_id;
  end loop;

  -- Drop snapshots from the cutoff forward
  delete from match_elo_snapshots s
    using matches m
    where s.match_id = m.id and m.played_at >= p_since;

  -- Replay matches from cutoff forward
  for v_match in
    select id from matches
    where played_at >= p_since
    order by played_at asc, created_at asc, id asc
  loop
    perform apply_match_elo(v_match.id);
  end loop;
end;
$$;

-- Convenience function called by the API after a match is recorded.
-- If the match is newer than every existing match, apply incrementally;
-- otherwise do a partial recompute from played_at forward.
create or replace function public.record_match_elo(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_played_at timestamptz;
  v_max_played_at timestamptz;
begin
  select played_at into v_played_at from matches where id = p_match_id;
  if v_played_at is null then
    raise exception 'match % not found', p_match_id;
  end if;

  select max(played_at) into v_max_played_at
    from matches where id <> p_match_id;

  if v_max_played_at is null or v_played_at >= v_max_played_at then
    -- In-order: apply incrementally
    perform apply_match_elo(p_match_id);
  else
    -- Out-of-order: partial recompute from this match's played_at forward
    perform recalculate_elo_since(v_played_at);
  end if;
end;
$$;

-- Grant execute on the public-callable functions to authenticated users.
-- (security definer means they run with the function owner's privileges,
-- bypassing RLS for the writes they need to do.)
grant execute on function public.elo_k_factor(int) to authenticated, anon;
grant execute on function public.elo_expected(int, int) to authenticated, anon;
-- The mutation functions are only callable from the service role in API routes:
revoke all on function public.apply_match_elo(uuid) from public;
revoke all on function public.recalculate_all_elo() from public;
revoke all on function public.recalculate_elo_since(timestamptz) from public;
revoke all on function public.record_match_elo(uuid) from public;
grant execute on function public.apply_match_elo(uuid) to service_role;
grant execute on function public.recalculate_all_elo() to service_role;
grant execute on function public.recalculate_elo_since(timestamptz) to service_role;
grant execute on function public.record_match_elo(uuid) to service_role;

-- ELO functions skip unrated matches. apply_match_elo gates on matches.rated;
-- recalculate_elo_since's games_played count also filters to rated rows so
-- backdated unrated matches don't inflate the count.

create or replace function public.apply_match_elo(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winning_side smallint;
  v_match_type text;
  v_rated boolean;
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
  if exists (select 1 from match_elo_snapshots where match_id = p_match_id) then
    return;
  end if;

  select winning_side, match_type, rated
    into v_winning_side, v_match_type, v_rated
    from matches where id = p_match_id;

  if v_winning_side is null then
    raise exception 'match % not found', p_match_id;
  end if;

  if v_rated is false then
    return;
  end if;

  select array_agg(player_id) into v_side1_ids
    from match_players where match_id = p_match_id and side = 1;
  select array_agg(player_id) into v_side2_ids
    from match_players where match_id = p_match_id and side = 2;

  perform 1 from players
    where id = any(v_side1_ids || v_side2_ids)
    for update;

  select avg(elo_rating)::double precision into v_side1_avg
    from players where id = any(v_side1_ids);
  select avg(elo_rating)::double precision into v_side2_avg
    from players where id = any(v_side2_ids);

  select min(games_played) into v_min_games
    from players where id = any(v_side1_ids || v_side2_ids);

  v_k := elo_k_factor(v_min_games);

  v_e1 := 1.0 / (1.0 + power(10.0, (v_side2_avg - v_side1_avg) / 400.0));

  if v_winning_side = 1 then
    v_delta := v_k * (1.0 - v_e1);
  else
    v_delta := v_k * (0.0 - v_e1);
  end if;

  foreach v_pid in array v_side1_ids loop
    insert into match_elo_snapshots (match_id, player_id, rating_before, rating_after)
    select p_match_id, v_pid, p.elo_rating, p.elo_rating + round(v_delta)::int
    from players p where p.id = v_pid;

    update players
      set elo_rating = elo_rating + round(v_delta)::int,
          games_played = games_played + 1
      where id = v_pid;
  end loop;

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
  create temporary table _affected_players (player_id uuid primary key) on commit drop;
  insert into _affected_players (player_id)
  select distinct mp.player_id
  from match_players mp
  join matches m on m.id = mp.match_id
  where m.played_at >= p_since;

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
                and m3.rated = true
          )
      where p.id = v_player.player_id;
  end loop;

  delete from match_elo_snapshots s
    using matches m
    where s.match_id = m.id and m.played_at >= p_since;

  for v_match in
    select id from matches
    where played_at >= p_since
    order by played_at asc, created_at asc, id asc
  loop
    perform apply_match_elo(v_match.id);
  end loop;
end;
$$;

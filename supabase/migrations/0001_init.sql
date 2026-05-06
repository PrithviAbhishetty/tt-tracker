-- Table Tennis Tracker — initial schema
-- Design: matches are immutable facts; players.elo_rating is a materialized derived value.

create extension if not exists pgcrypto;

-- =============================================================================
-- players: registered users + guests in one table
-- =============================================================================
create table public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  user_id uuid unique references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  elo_rating int not null default 1200,
  games_played int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index players_elo_rating_idx on public.players (elo_rating desc);
create index players_active_idx on public.players (is_active) where is_active;

-- =============================================================================
-- matches: singles + doubles unified
-- =============================================================================
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  match_type text not null check (match_type in ('singles','doubles')),
  winning_side smallint not null check (winning_side in (1,2)),
  played_at timestamptz not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  tournament_match_id uuid,
  client_uuid uuid not null unique,
  created_at timestamptz not null default now()
);

create index matches_played_at_idx on public.matches (played_at, created_at);
create index matches_recorded_by_idx on public.matches (recorded_by);

-- =============================================================================
-- match_players: 2 rows for singles, 4 for doubles
-- =============================================================================
create table public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  side smallint not null check (side in (1,2)),
  primary key (match_id, player_id)
);

create index match_players_player_idx on public.match_players (player_id);

-- =============================================================================
-- match_elo_snapshots: per-match before/after ratings (powers history charts)
-- =============================================================================
create table public.match_elo_snapshots (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rating_before int not null,
  rating_after int not null,
  primary key (match_id, player_id)
);

create index match_elo_snapshots_player_idx on public.match_elo_snapshots (player_id);

-- =============================================================================
-- tournaments
-- =============================================================================
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null check (format in ('round_robin','single_elim')),
  match_type text not null check (match_type in ('singles','doubles')),
  status text not null default 'setup' check (status in ('setup','in_progress','completed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.tournament_participants (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  team_label text,
  seed int,
  primary key (tournament_id, player_id)
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round int not null,
  position int not null,
  side1_player_ids uuid[] not null default '{}',
  side2_player_ids uuid[] not null default '{}',
  winner_advances_to uuid references public.tournament_matches(id) on delete set null,
  winner_advances_to_side smallint check (winner_advances_to_side in (1,2)),
  match_id uuid unique references public.matches(id) on delete set null,
  created_at timestamptz not null default now()
);

create index tournament_matches_tournament_idx on public.tournament_matches (tournament_id, round, position);

-- Now that tournament_matches exists, add the FK from matches.tournament_match_id
alter table public.matches
  add constraint matches_tournament_match_fk
  foreign key (tournament_match_id) references public.tournament_matches(id) on delete set null;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_elo_snapshots enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.tournament_matches enable row level security;

-- Players: any authenticated user can read; insert for self; update name/active for creator or self.
create policy players_select on public.players
  for select to authenticated using (true);

create policy players_insert on public.players
  for insert to authenticated with check (created_by = auth.uid());

-- Display name + is_active editable by creator (for guests) or by the linked user (self)
create policy players_update on public.players
  for update to authenticated
  using (created_by = auth.uid() or user_id = auth.uid())
  with check (created_by = auth.uid() or user_id = auth.uid());

-- Matches: read all; insert by recorder; update/delete by recorder within 24h.
create policy matches_select on public.matches
  for select to authenticated using (true);

create policy matches_insert on public.matches
  for insert to authenticated with check (recorded_by = auth.uid());

create policy matches_update on public.matches
  for update to authenticated
  using (recorded_by = auth.uid() and created_at > now() - interval '24 hours')
  with check (recorded_by = auth.uid());

create policy matches_delete on public.matches
  for delete to authenticated
  using (recorded_by = auth.uid() and created_at > now() - interval '24 hours');

-- Match players: read all; writes only via the API (service role) alongside the match insert.
create policy match_players_select on public.match_players
  for select to authenticated using (true);

create policy match_players_insert on public.match_players
  for insert to authenticated
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.recorded_by = auth.uid()
    )
  );

-- Snapshots: read all; writes only via service role.
create policy match_elo_snapshots_select on public.match_elo_snapshots
  for select to authenticated using (true);

-- Tournaments: read all; create by anyone authenticated; update only by creator.
create policy tournaments_select on public.tournaments
  for select to authenticated using (true);

create policy tournaments_insert on public.tournaments
  for insert to authenticated with check (created_by = auth.uid());

create policy tournaments_update on public.tournaments
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy tournaments_delete on public.tournaments
  for delete to authenticated using (created_by = auth.uid());

create policy tournament_participants_select on public.tournament_participants
  for select to authenticated using (true);

create policy tournament_participants_insert on public.tournament_participants
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

create policy tournament_participants_delete on public.tournament_participants
  for delete to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

create policy tournament_matches_select on public.tournament_matches
  for select to authenticated using (true);

-- Tournament matches inserted by tournament creator (during bracket generation)
-- and updated by tournament creator (advancing winners). The match_id link write
-- happens via the API alongside match insert.
create policy tournament_matches_insert on public.tournament_matches
  for insert to authenticated
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

create policy tournament_matches_update on public.tournament_matches
  for update to authenticated
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.created_by = auth.uid()
    )
  );

-- Groups: a named set of player members. ELO stays global; groups are a
-- filtered lens. A match shows in a group iff every participant is a member.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index groups_created_by_idx on public.groups (created_by);

create type group_role as enum ('owner', 'member');

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
create index group_members_player_idx on public.group_members (player_id);

alter table public.tournaments
  add column group_id uuid references public.groups(id) on delete set null;
create index tournaments_group_idx on public.tournaments (group_id);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create or replace function public.is_group_member(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.players p on p.id = gm.player_id
    where gm.group_id = g and p.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(g uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    join public.players p on p.id = gm.player_id
    where gm.group_id = g and p.user_id = auth.uid() and gm.role = 'owner'
  );
$$;

create policy groups_select on public.groups
  for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());

create policy groups_insert on public.groups
  for insert to authenticated
  with check (created_by = auth.uid());

create policy groups_update on public.groups
  for update to authenticated
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

create policy groups_delete on public.groups
  for delete to authenticated
  using (public.is_group_owner(id));

create policy group_members_select on public.group_members
  for select to authenticated
  using (public.is_group_member(group_id));

create policy group_members_insert on public.group_members
  for insert to authenticated
  with check (
    public.is_group_owner(group_id)
    or exists (
      select 1 from public.groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

create policy group_members_update on public.group_members
  for update to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

create policy group_members_delete on public.group_members
  for delete to authenticated
  using (
    public.is_group_owner(group_id)
    or exists (
      select 1 from public.players p
      where p.id = player_id and p.user_id = auth.uid()
    )
  );

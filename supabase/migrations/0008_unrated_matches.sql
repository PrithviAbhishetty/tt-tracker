-- Matches involving guests (or manually flagged) do not affect ELO.
-- Default true preserves "rated" for the common case; the API computes the
-- final value at insert time based on participants and an optional override.

alter table public.matches
  add column rated boolean not null default true;

create index matches_rated_idx on public.matches (rated) where rated;

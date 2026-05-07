-- Allow the creator of a guest player to delete it. Linked auth users
-- (user_id is not null) can never be deleted via this policy — they have
-- to go through the admin / account flows.
create policy players_delete on public.players
  for delete to authenticated
  using (created_by = auth.uid() and user_id is null);

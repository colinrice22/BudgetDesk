-- Row-level security policy placeholders.

alter table app_user enable row level security;
alter table budget_category enable row level security;
alter table transaction_entry enable row level security;

-- Replace auth.uid() with your auth provider identity function.
create policy app_user_is_owner on app_user
  using (id = auth.uid())
  with check (id = auth.uid());

create policy category_is_owner on budget_category
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy transaction_is_owner on transaction_entry
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

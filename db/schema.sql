-- Core schema draft for zero-based budgeting.

create table if not exists app_user (
  id uuid primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists budget_category (
  id uuid primary key,
  user_id uuid not null references app_user(id) on delete cascade,
  name text not null,
  assigned_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists transaction_entry (
  id uuid primary key,
  user_id uuid not null references app_user(id) on delete cascade,
  category_id uuid not null references budget_category(id) on delete cascade,
  amount_cents integer not null,
  note text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

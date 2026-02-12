-- Create Budgets Table
create table if not exists public.budgets (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  amount numeric not null default 0,
  created_at timestamptz default now(),
  user_id uuid default auth.uid()
);

-- Enable RLS
alter table public.budgets enable row level security;

-- Policies
create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- Add unique constraint on category per user to prevent duplicates
create unique index if not exists budgets_category_user_unique_idx 
  on public.budgets (user_id, category);

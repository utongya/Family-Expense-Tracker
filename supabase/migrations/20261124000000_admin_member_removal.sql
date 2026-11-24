alter table public.users
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid references public.users (id) on delete set null;

create index if not exists users_family_active_idx
  on public.users (family_id)
  where removed_at is null;

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.users
  where id = (select auth.uid())
    and removed_at is null
  limit 1;
$$;

create or replace function public.is_family_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
      and removed_at is null
  );
$$;

comment on column public.users.removed_at is
  'Soft-removal timestamp. Expense ownership and history are intentionally preserved.';


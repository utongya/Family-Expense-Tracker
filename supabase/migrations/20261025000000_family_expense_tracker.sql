create extension if not exists pgcrypto;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  display_name varchar(120) not null,
  role varchar(16) not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name varchar(80) not null,
  icon varchar(40),
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  period_month date not null,
  unique (family_id, category_id, period_month)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index expenses_family_date_idx on public.expenses (family_id, expense_date desc);
create index budgets_family_month_idx on public.budgets (family_id, period_month);

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
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  family_display_name text;
  profile_display_name text;
begin
  family_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'family_name'), ''),
    'ครอบครัวของ ' || coalesce(split_part(new.email, '@', 1), 'สมาชิก')
  );
  profile_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'สมาชิก'), '@', 1)
  );

  insert into public.families (name)
  values (family_display_name)
  returning id into new_family_id;

  insert into public.users (id, family_id, display_name, role)
  values (new.id, new_family_id, profile_display_name, 'admin');

  insert into public.categories (family_id, name, icon)
  values
    (new_family_id, 'อาหาร และเครื่องดื่ม', 'utensils'),
    (new_family_id, 'ช็อปปิ้ง', 'shopping-bag'),
    (new_family_id, 'ค่างวดบ้าน', 'house'),
    (new_family_id, 'ค่างวด SAM', 'landmark'),
    (new_family_id, 'สาธารณูปโภค', 'lightbulb'),
    (new_family_id, 'คชจ.ฮาโกะ/ฮาซิ', 'paw-print'),
    (new_family_id, 'ของใช้เบ็ดเตล็ด', 'package'),
    (new_family_id, 'ท่องเที่ยว/สันทนาการ', 'plane'),
    (new_family_id, 'อื่น ๆ', 'shapes');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_family on auth.users;
create trigger on_auth_user_created_family
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.families enable row level security;
alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.budgets enable row level security;
alter table public.expenses enable row level security;

create policy "Family members can read their family"
  on public.families for select
  to authenticated
  using (id = (select public.current_family_id()));

create policy "Family admins can update their family"
  on public.families for update
  to authenticated
  using (id = (select public.current_family_id()) and (select public.is_family_admin()))
  with check (id = (select public.current_family_id()) and (select public.is_family_admin()));

create policy "Family members can read family profiles"
  on public.users for select
  to authenticated
  using (family_id = (select public.current_family_id()));

create policy "Family members can read categories"
  on public.categories for select
  to authenticated
  using (family_id = (select public.current_family_id()));

create policy "Family admins can manage categories"
  on public.categories for all
  to authenticated
  using (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
  )
  with check (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
  );

create policy "Family members can read budgets"
  on public.budgets for select
  to authenticated
  using (family_id = (select public.current_family_id()));

create policy "Family admins can manage budgets"
  on public.budgets for all
  to authenticated
  using (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
  )
  with check (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
  );

create policy "Family members can read expenses"
  on public.expenses for select
  to authenticated
  using (family_id = (select public.current_family_id()));

create policy "Family members can add their own expenses"
  on public.expenses for insert
  to authenticated
  with check (
    family_id = (select public.current_family_id())
    and user_id = (select auth.uid())
  );

create policy "Family members can update family expenses"
  on public.expenses for update
  to authenticated
  using (family_id = (select public.current_family_id()))
  with check (family_id = (select public.current_family_id()));

create policy "Family members can delete family expenses"
  on public.expenses for delete
  to authenticated
  using (family_id = (select public.current_family_id()));

grant select on public.families, public.users, public.categories, public.budgets, public.expenses to authenticated;
grant insert, update, delete on public.categories, public.budgets, public.expenses to authenticated;
grant update on public.families to authenticated;
grant execute on function public.current_family_id() to authenticated;
grant execute on function public.is_family_admin() to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;

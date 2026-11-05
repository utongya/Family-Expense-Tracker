create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  email text not null check (email = lower(email)),
  role varchar(16) not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, email)
);

create index family_invites_email_idx on public.family_invites (email);

alter table public.family_invites enable row level security;

create policy "Family admins can manage invites"
  on public.family_invites for all
  to authenticated
  using (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
  )
  with check (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
  );

grant select, insert, update, delete on public.family_invites to authenticated;

-- Invited emails join the inviting family with the assigned role instead of creating a new family.
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
  invite public.family_invites%rowtype;
begin
  profile_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'สมาชิก'), '@', 1)
  );

  select * into invite
  from public.family_invites
  where email = lower(new.email)
  order by created_at
  limit 1;

  if found then
    insert into public.users (id, family_id, display_name, role)
    values (new.id, invite.family_id, profile_display_name, invite.role);

    delete from public.family_invites where email = lower(new.email);
    return new;
  end if;

  family_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'family_name'), ''),
    'ครอบครัวของ ' || profile_display_name
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

-- Admins can change other members' roles (never their own, to avoid locking the family out).
create policy "Family admins can update member roles"
  on public.users for update
  to authenticated
  using (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
    and id <> (select auth.uid())
  )
  with check (
    family_id = (select public.current_family_id())
    and (select public.is_family_admin())
    and id <> (select auth.uid())
  );

grant update (role) on public.users to authenticated;

-- Members may only add and delete their own expenses; admins may also edit and delete any family expense.
drop policy "Family members can update family expenses" on public.expenses;
drop policy "Family members can delete family expenses" on public.expenses;

create policy "Family admins can update family expenses"
  on public.expenses for update
  to authenticated
  using (family_id = (select public.current_family_id()) and (select public.is_family_admin()))
  with check (family_id = (select public.current_family_id()) and (select public.is_family_admin()));

create policy "Members delete own expenses, admins delete any"
  on public.expenses for delete
  to authenticated
  using (
    family_id = (select public.current_family_id())
    and (user_id = (select auth.uid()) or (select public.is_family_admin()))
  );

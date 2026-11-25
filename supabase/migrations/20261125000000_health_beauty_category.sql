insert into public.categories (family_id, name, icon)
select families.id, 'สุขภาพ และความงาม', 'heart-pulse'
from public.families
on conflict (family_id, name) do update
set icon = excluded.icon;

create or replace function public.ensure_health_beauty_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (family_id, name, icon)
  values (new.family_id, 'สุขภาพ และความงาม', 'heart-pulse')
  on conflict (family_id, name) do update
  set icon = excluded.icon;

  return new;
end;
$$;

drop trigger if exists ensure_health_beauty_category_on_member_insert on public.users;
create trigger ensure_health_beauty_category_on_member_insert
  after insert on public.users
  for each row execute procedure public.ensure_health_beauty_category();

revoke all on function public.ensure_health_beauty_category() from public, anon, authenticated;

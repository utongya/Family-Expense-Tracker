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
  profile_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'สมาชิก'), '@', 1)
  );
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

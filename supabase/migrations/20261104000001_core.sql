-- =====================================================================
-- 0001 CORE: institutes, profiles, roles, settings, sequences, audit
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------- Enums ----------
create type public.app_role as enum ('admin', 'teacher', 'student', 'parent');
create type public.account_status as enum ('active', 'inactive', 'suspended', 'pending_activation');
create type public.record_status as enum ('active', 'inactive');

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Institutes ----------
create table public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  logo_path text,
  address text,
  phone text,
  email text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_institutes_updated before update on public.institutes
  for each row execute function public.set_updated_at();

-- ---------- Institute settings (one row per institute) ----------
create table public.institute_settings (
  institute_id uuid primary key references public.institutes(id) on delete cascade,
  timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR',
  working_days smallint[] not null default '{1,2,3,4,5,6}', -- ISO dow 1=Mon..7=Sun
  current_academic_year_id uuid, -- FK added after academic_years exists
  -- Numbering
  admission_prefix text not null default 'ADM',
  receipt_prefix text not null default 'RCPT',
  -- Fees
  default_due_day smallint not null default 10 check (default_due_day between 1 and 28),
  late_fee_enabled boolean not null default false,
  late_fee_type text not null default 'fixed' check (late_fee_type in ('fixed', 'percent')),
  late_fee_value numeric(12,2) not null default 0 check (late_fee_value >= 0),
  late_fee_grace_days smallint not null default 0 check (late_fee_grace_days >= 0),
  payment_methods text[] not null default '{cash,upi,bank_transfer,cheque,online,other}',
  receipt_footer text,
  -- Attendance
  -- 'exclude' = excused sessions removed from denominator; 'count_present' = excused counts as attended;
  -- 'count_absent' = excused counts as not attended
  excused_attendance_policy text not null default 'exclude'
    check (excused_attendance_policy in ('exclude', 'count_present', 'count_absent')),
  late_counts_as_present boolean not null default true,
  attendance_correction_hours integer not null default 24 check (attendance_correction_hours >= 0),
  notify_parent_on_absence boolean not null default true,
  -- Exams
  results_require_approval boolean not null default true,
  -- Homework
  allow_late_submission boolean not null default true,
  max_upload_mb integer not null default 10 check (max_upload_mb between 1 and 50),
  -- Notifications
  fee_reminder_days_before smallint[] not null default '{3}',
  fee_reminder_on_due boolean not null default true,
  fee_reminder_days_after smallint[] not null default '{3,7}',
  email_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  whatsapp_provider jsonb not null default '{}'::jsonb, -- non-secret config only
  -- Password / account policy
  min_password_length smallint not null default 8 check (min_password_length between 6 and 64),
  show_birthdays boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger trg_institute_settings_updated before update on public.institute_settings
  for each row execute function public.set_updated_at();

-- ---------- Profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institute_id uuid references public.institutes(id),
  full_name text not null default '',
  email text,
  phone text,
  avatar_path text,
  status public.account_status not null default 'pending_activation',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_phone_unique on public.profiles (institute_id, phone) where phone is not null;
create index profiles_institute_idx on public.profiles (institute_id);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- New auth user -> profile row. Institute + roles are only ever set by
-- trusted server code (service role) or admin RPCs, never by user metadata.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (new.id, new.email, new.phone, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------- Roles ----------
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institute_id uuid not null references public.institutes(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (user_id, institute_id, role)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- ---------- Number sequences (admission no, receipt no) ----------
create table public.number_sequences (
  institute_id uuid not null references public.institutes(id) on delete cascade,
  seq_key text not null,
  next_value bigint not null default 1,
  primary key (institute_id, seq_key)
);

-- Atomically take the next number for a key (row-locked, gap-free per commit).
create or replace function public.next_sequence_value(p_institute uuid, p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into public.number_sequences (institute_id, seq_key, next_value)
  values (p_institute, p_key, 1)
  on conflict (institute_id, seq_key) do nothing;

  update public.number_sequences
     set next_value = next_value + 1
   where institute_id = p_institute and seq_key = p_key
  returning next_value - 1 into v;
  return v;
end $$;
revoke all on function public.next_sequence_value(uuid, text) from public, anon, authenticated;

-- ---------- Audit logs ----------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  institute_id uuid references public.institutes(id) on delete cascade,
  user_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_logs_institute_time_idx on public.audit_logs (institute_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

-- =====================================================================
-- Security helper functions (SECURITY DEFINER, read-only, stable).
-- They bypass RLS internally so policies don't recurse.
-- =====================================================================
create or replace function public.auth_institute_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.institute_id from public.profiles p
   where p.id = auth.uid() and p.status = 'active'
$$;

create or replace function public.has_role(p_role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles r
      join public.profiles p on p.id = r.user_id
     where r.user_id = auth.uid()
       and r.role = p_role
       and r.institute_id = p.institute_id
       and p.status = 'active'
  )
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role('admin')
$$;

create or replace function public.write_audit(
  p_action text, p_entity text, p_entity_id text,
  p_old jsonb default null, p_new jsonb default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, old_values, new_values, reason)
  values (public.auth_institute_id(), auth.uid(), p_action, p_entity, p_entity_id, p_old, p_new, p_reason);
end $$;
revoke all on function public.write_audit(text, text, text, jsonb, jsonb, text) from public, anon;
grant execute on function public.write_audit(text, text, text, jsonb, jsonb, text) to authenticated;

-- Generic row-level audit trigger for sensitive tables.
create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid;
  v_id text;
begin
  if tg_op = 'DELETE' then
    v_inst := (to_jsonb(old) ->> 'institute_id')::uuid;
    v_id := to_jsonb(old) ->> 'id';
  else
    v_inst := (to_jsonb(new) ->> 'institute_id')::uuid;
    v_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'institute_id');
  end if;
  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, old_values, new_values)
  values (
    coalesce(v_inst, public.auth_institute_id()), auth.uid(), lower(tg_op), tg_table_name, v_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

-- Prevent users from changing their own institute/status via profile update.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.institute_id is distinct from old.institute_id
       or new.status is distinct from old.status
       or new.id is distinct from old.id then
      raise exception 'You are not allowed to change these profile fields';
    end if;
  end if;
  return new;
end $$;
create trigger trg_profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create trigger trg_audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();
create trigger trg_audit_institute_settings after update on public.institute_settings
  for each row execute function public.audit_row_change();

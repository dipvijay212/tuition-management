-- =====================================================================
-- 0002 ACADEMIC STRUCTURE + PEOPLE (teachers, students, guardians)
-- =====================================================================

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  name text not null,                     -- e.g. "2026-27"
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date > start_date),
  unique (institute_id, name)
);
create unique index academic_years_one_current on public.academic_years (institute_id) where is_current;

alter table public.institute_settings
  add constraint institute_settings_current_year_fk
  foreign key (current_academic_year_id) references public.academic_years(id) on delete set null;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id),
  name text not null,                     -- e.g. "Standard 10"
  description text,
  sort_order integer not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index classes_unique_name on public.classes (institute_id, coalesce(academic_year_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create trigger trg_classes_updated before update on public.classes for each row execute function public.set_updated_at();

-- A subject may be tied to one class or be reusable (class_id null).
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  class_id uuid references public.classes(id),
  name text not null,
  code text,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index subjects_unique_code on public.subjects (institute_id, upper(code)) where code is not null;
create index subjects_class_idx on public.subjects (class_id);
create trigger trg_subjects_updated before update on public.subjects for each row execute function public.set_updated_at();

-- ---------- Teachers ----------
create type public.employment_status as enum ('active', 'on_leave', 'resigned', 'terminated');

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null check (length(trim(full_name)) > 0),
  photo_path text,
  phone text not null,
  email text,
  address text,
  qualification text,
  specialization text,
  subject_ids uuid[] not null default '{}',  -- subjects the teacher can teach (qualification)
  joining_date date,
  employment_status public.employment_status not null default 'active',
  monthly_salary numeric(12,2) check (monthly_salary is null or monthly_salary >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institute_id, phone)
);
create trigger trg_teachers_updated before update on public.teachers for each row execute function public.set_updated_at();

-- ---------- Batches ----------
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  class_id uuid not null references public.classes(id),
  academic_year_id uuid references public.academic_years(id),
  name text not null,
  start_date date,
  end_date date,
  class_days smallint[] not null default '{1,2,3,4,5}',  -- ISO dow
  start_time time,
  end_time time,
  capacity integer check (capacity is null or capacity > 0),
  room text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (end_time is null or start_time is null or end_time > start_time)
);
create unique index batches_unique_name on public.batches (institute_id, class_id, lower(name));
create index batches_class_idx on public.batches (class_id);
create trigger trg_batches_updated before update on public.batches for each row execute function public.set_updated_at();

create table public.teacher_batches (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  batch_id uuid not null references public.batches(id),
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index teacher_batches_active_unique on public.teacher_batches (teacher_id, batch_id) where is_active;
create index teacher_batches_batch_idx on public.teacher_batches (batch_id);

create table public.batch_subjects (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  batch_id uuid not null references public.batches(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  teacher_id uuid references public.teachers(id),
  unique (batch_id, subject_id)
);

-- ---------- Students ----------
create type public.student_status as enum ('active', 'inactive', 'on_hold', 'discontinued', 'completed');
create type public.gender as enum ('male', 'female', 'other');

create table public.students (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null, -- student login, optional
  admission_no text not null,
  full_name text not null check (length(trim(full_name)) > 0),
  photo_path text,
  date_of_birth date,
  gender public.gender,
  blood_group text,
  address text,
  city text,
  state text,
  pin_code text check (pin_code is null or pin_code ~ '^[0-9]{6}$'),
  phone text,
  email text,
  school_name text,
  class_id uuid references public.classes(id),
  academic_year_id uuid references public.academic_years(id),
  subject_ids uuid[] not null default '{}',
  admission_date date not null default current_date,
  previous_academics text,
  status public.student_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institute_id, admission_no)
);
create index students_institute_status_idx on public.students (institute_id, status);
create index students_class_idx on public.students (class_id);
create index students_name_idx on public.students (institute_id, lower(full_name));
create trigger trg_students_updated before update on public.students for each row execute function public.set_updated_at();

create table public.student_status_history (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id),
  from_status public.student_status,
  to_status public.student_status not null,
  reason text,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);
create index student_status_history_student_idx on public.student_status_history (student_id, changed_at desc);

create or replace function public.track_student_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.student_status_history (institute_id, student_id, from_status, to_status, reason, changed_by)
    values (new.institute_id, new.id, case when tg_op = 'UPDATE' then old.status end, new.status,
            nullif(current_setting('app.status_reason', true), ''), auth.uid());
  end if;
  return new;
end $$;
create trigger trg_students_status after insert or update of status on public.students
  for each row execute function public.track_student_status();
create trigger trg_audit_students after insert or update on public.students
  for each row execute function public.audit_row_change();

create type public.batch_enrollment_status as enum ('active', 'transferred', 'ended');

create table public.student_batches (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id),
  batch_id uuid not null references public.batches(id),
  start_date date not null default current_date,
  end_date date,
  status public.batch_enrollment_status not null default 'active',
  end_reason text,
  transferred_to uuid references public.student_batches(id),
  capacity_override_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
-- No duplicate active enrolment in the same batch.
create unique index student_batches_active_unique on public.student_batches (student_id, batch_id) where status = 'active';
create index student_batches_batch_idx on public.student_batches (batch_id, status);
create index student_batches_student_idx on public.student_batches (student_id);
create trigger trg_audit_student_batches after insert or update on public.student_batches
  for each row execute function public.audit_row_change();

-- Capacity check (override requires a recorded reason).
create or replace function public.check_batch_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_cap integer; v_count integer; v_bstatus public.record_status;
begin
  if new.status <> 'active' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'active' then return new; end if;
  select capacity, status into v_cap, v_bstatus from public.batches where id = new.batch_id;
  if v_bstatus <> 'active' then
    raise exception 'Cannot assign students to an inactive batch';
  end if;
  if (select status from public.students where id = new.student_id) <> 'active' then
    raise exception 'Only active students can be assigned to a batch';
  end if;
  if v_cap is not null then
    select count(*) into v_count from public.student_batches
     where batch_id = new.batch_id and status = 'active' and id <> new.id;
    if v_count >= v_cap and coalesce(trim(new.capacity_override_reason), '') = '' then
      raise exception 'Batch is full (capacity %). Provide an override reason to exceed capacity.', v_cap
        using errcode = 'P0001', hint = 'capacity_exceeded';
    end if;
  end if;
  return new;
end $$;
create trigger trg_student_batches_capacity before insert or update on public.student_batches
  for each row execute function public.check_batch_capacity();

create table public.student_documents (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id),
  title text not null,
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index student_documents_student_idx on public.student_documents (student_id);

-- ---------- Guardians and parent links ----------
create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  profile_id uuid unique references public.profiles(id) on delete set null, -- parent login, optional
  full_name text not null check (length(trim(full_name)) > 0),
  phone text not null,
  alt_phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institute_id, phone)   -- one guardian record per phone: siblings share it
);
create trigger trg_guardians_updated before update on public.guardians for each row execute function public.set_updated_at();

create table public.parent_students (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id),
  student_id uuid not null references public.students(id),
  relationship text not null default 'parent',
  is_primary boolean not null default false,
  is_emergency_contact boolean not null default false,
  created_at timestamptz not null default now(),
  unique (guardian_id, student_id)
);
create index parent_students_student_idx on public.parent_students (student_id);

-- =====================================================================
-- Relationship helper functions used by RLS
-- =====================================================================
create or replace function public.my_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select t.id from public.teachers t
   where t.profile_id = auth.uid() and t.institute_id = public.auth_institute_id()
$$;

create or replace function public.my_batch_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tb.batch_id from public.teacher_batches tb
   where tb.teacher_id = public.my_teacher_id() and tb.is_active
  union
  select bs.batch_id from public.batch_subjects bs
   where bs.teacher_id = public.my_teacher_id()
$$;

-- Students the caller is allowed to see as self/parent.
create or replace function public.my_student_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from public.students s
   where s.profile_id = auth.uid() and s.institute_id = public.auth_institute_id()
  union
  select ps.student_id from public.parent_students ps
    join public.guardians g on g.id = ps.guardian_id
   where g.profile_id = auth.uid() and g.institute_id = public.auth_institute_id()
$$;

create or replace function public.teacher_can_access_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.student_batches sb
     where sb.student_id = p_student
       and sb.status = 'active'
       and sb.batch_id in (select public.my_batch_ids())
  )
$$;

create or replace function public.can_view_student(p_student uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    (public.is_admin() and exists (select 1 from public.students s where s.id = p_student and s.institute_id = public.auth_institute_id()))
    or p_student in (select public.my_student_ids())
    or (public.has_role('teacher') and public.teacher_can_access_student(p_student))
$$;

-- Batches visible to a student/parent (through active or past enrolments).
create or replace function public.my_student_batch_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select sb.batch_id from public.student_batches sb
   where sb.student_id in (select public.my_student_ids())
$$;

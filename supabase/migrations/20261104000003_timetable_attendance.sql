-- =====================================================================
-- 0003 TIMETABLE, CLASS SESSIONS, ATTENDANCE
-- =====================================================================

-- Recurring weekly slot.
create table public.timetable (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id),
  batch_id uuid not null references public.batches(id),
  subject_id uuid references public.subjects(id),
  teacher_id uuid references public.teachers(id),
  day_of_week smallint not null check (day_of_week between 1 and 7), -- ISO dow
  start_time time not null,
  end_time time not null,
  room text,
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  override_reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  check (effective_to is null or effective_to >= effective_from)
);
create index timetable_batch_idx on public.timetable (batch_id) where is_active;
create index timetable_teacher_idx on public.timetable (teacher_id) where is_active;

-- Conflict validation for recurring slots (teacher / batch / room).
create or replace function public.check_timetable_conflicts()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_conflict text;
begin
  if not new.is_active then return new; end if;
  if (select status from public.batches where id = new.batch_id) <> 'active' then
    raise exception 'Inactive batches cannot receive new schedules';
  end if;
  if coalesce(trim(new.override_reason), '') <> '' then return new; end if;

  select case
           when t.batch_id = new.batch_id then 'This batch already has a class at this time'
           when t.teacher_id = new.teacher_id then 'The teacher is already scheduled at this time'
           else 'Room ' || new.room || ' is already booked at this time'
         end
    into v_conflict
    from public.timetable t
   where t.id <> new.id
     and t.institute_id = new.institute_id
     and t.is_active
     and t.day_of_week = new.day_of_week
     and t.start_time < new.end_time and new.start_time < t.end_time
     and daterange(t.effective_from, coalesce(t.effective_to, 'infinity'::date), '[]')
         && daterange(new.effective_from, coalesce(new.effective_to, 'infinity'::date), '[]')
     and (t.batch_id = new.batch_id
          or (new.teacher_id is not null and t.teacher_id = new.teacher_id)
          or (new.room is not null and t.room is not null and lower(t.room) = lower(new.room)))
   limit 1;

  if v_conflict is not null then
    raise exception '%', v_conflict using hint = 'schedule_conflict';
  end if;
  return new;
end $$;
create trigger trg_timetable_conflicts before insert or update on public.timetable
  for each row execute function public.check_timetable_conflicts();

create type public.session_status as enum ('scheduled', 'completed', 'cancelled', 'rescheduled');

-- A concrete dated class session (generated from timetable, or ad-hoc).
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  timetable_id uuid references public.timetable(id),
  batch_id uuid not null references public.batches(id),
  subject_id uuid references public.subjects(id),
  teacher_id uuid references public.teachers(id),
  session_date date not null,
  start_time time not null,
  end_time time not null,
  room text,
  status public.session_status not null default 'scheduled',
  cancel_reason text,
  rescheduled_from uuid references public.class_sessions(id),
  attendance_submitted_at timestamptz,
  attendance_submitted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
-- Idempotent generation: one session per timetable slot per date.
create unique index class_sessions_slot_unique on public.class_sessions (timetable_id, session_date) where timetable_id is not null;
create index class_sessions_batch_date_idx on public.class_sessions (batch_id, session_date);
create index class_sessions_teacher_date_idx on public.class_sessions (teacher_id, session_date);
create index class_sessions_date_idx on public.class_sessions (institute_id, session_date);

-- Generate sessions from active timetable for a date range (idempotent).
create or replace function public.generate_class_sessions(p_from date, p_to date)
returns integer language plpgsql security definer set search_path = public as $$
declare v_inst uuid := public.auth_institute_id(); v_count integer;
begin
  if not public.is_admin() then raise exception 'Only admins can generate sessions'; end if;
  if p_to < p_from or p_to - p_from > 120 then raise exception 'Invalid date range (max 120 days)'; end if;

  insert into public.class_sessions (institute_id, timetable_id, batch_id, subject_id, teacher_id, session_date, start_time, end_time, room)
  select t.institute_id, t.id, t.batch_id, t.subject_id, t.teacher_id, d::date, t.start_time, t.end_time, t.room
    from public.timetable t
    join public.batches b on b.id = t.batch_id and b.status = 'active'
    cross join generate_series(p_from, p_to, interval '1 day') d
   where t.institute_id = v_inst
     and t.is_active
     and extract(isodow from d) = t.day_of_week
     and d::date between t.effective_from and coalesce(t.effective_to, 'infinity'::date)
     and (b.start_date is null or d::date >= b.start_date)
     and (b.end_date is null or d::date <= b.end_date)
  on conflict (timetable_id, session_date) where timetable_id is not null do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------- Attendance ----------
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id),
  student_id uuid not null references public.students(id),
  batch_id uuid not null references public.batches(id),
  session_date date not null,
  status public.attendance_status not null,
  remarks text,
  marked_by uuid references public.profiles(id),
  marked_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz,
  unique (session_id, student_id)
);
create index attendance_student_date_idx on public.attendance (student_id, session_date);
create index attendance_batch_date_idx on public.attendance (batch_id, session_date);
create index attendance_inst_date_idx on public.attendance (institute_id, session_date);

-- Submit attendance for a whole session in one transaction.
-- p_records: [{"student_id": "...", "status": "present", "remarks": "..."}]
create or replace function public.submit_attendance(p_session uuid, p_records jsonb, p_reason text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_s public.class_sessions;
  v_inst uuid := public.auth_institute_id();
  v_is_admin boolean := public.is_admin();
  v_hours integer;
  v_tz text;
  v_session_end timestamptz;
  v_rec jsonb;
  v_student uuid;
  v_status public.attendance_status;
  v_old public.attendance;
  v_count integer := 0;
begin
  select * into v_s from public.class_sessions where id = p_session and institute_id = v_inst;
  if not found then raise exception 'Session not found'; end if;
  if v_s.status = 'cancelled' then raise exception 'Attendance cannot be marked for a cancelled session'; end if;

  if not v_is_admin then
    if not public.has_role('teacher') or v_s.batch_id not in (select public.my_batch_ids()) then
      raise exception 'You are not authorized to mark attendance for this session';
    end if;
  end if;

  select attendance_correction_hours, timezone into v_hours, v_tz
    from public.institute_settings where institute_id = v_inst;
  v_session_end := (v_s.session_date + v_s.end_time) at time zone v_tz;

  if (v_s.session_date + v_s.start_time) at time zone v_tz > now() + interval '30 minutes' and not v_is_admin then
    raise exception 'Attendance cannot be marked for a future session';
  end if;
  -- Teachers may edit until the correction deadline; afterwards admin only (with reason).
  if not v_is_admin and v_s.attendance_submitted_at is not null
     and now() > v_session_end + make_interval(hours => v_hours) then
    raise exception 'The correction period for this session has ended. Ask an admin to correct it.';
  end if;
  if v_is_admin and v_s.attendance_submitted_at is not null
     and now() > v_session_end + make_interval(hours => v_hours)
     and coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to correct attendance after the correction period';
  end if;

  for v_rec in select * from jsonb_array_elements(p_records) loop
    v_student := (v_rec ->> 'student_id')::uuid;
    v_status := (v_rec ->> 'status')::public.attendance_status;

    if not exists (
      select 1 from public.student_batches sb
       where sb.student_id = v_student and sb.batch_id = v_s.batch_id
         and sb.start_date <= v_s.session_date
         and (sb.end_date is null or sb.end_date >= v_s.session_date)
    ) then
      raise exception 'Student % is not enrolled in this batch on this date', v_student;
    end if;

    select * into v_old from public.attendance where session_id = p_session and student_id = v_student;
    if found then
      if v_old.status is distinct from v_status or v_old.remarks is distinct from (v_rec ->> 'remarks') then
        update public.attendance
           set status = v_status, remarks = v_rec ->> 'remarks', updated_by = auth.uid(), updated_at = now()
         where id = v_old.id;
        insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, old_values, new_values, reason)
        values (v_inst, auth.uid(), 'attendance_correction', 'attendance', v_old.id::text,
                jsonb_build_object('status', v_old.status, 'remarks', v_old.remarks),
                jsonb_build_object('status', v_status, 'remarks', v_rec ->> 'remarks'), p_reason);
      end if;
    else
      if (select status from public.students where id = v_student) <> 'active' then
        raise exception 'Attendance cannot be recorded for an inactive student';
      end if;
      insert into public.attendance (institute_id, session_id, student_id, batch_id, session_date, status, remarks, marked_by)
      values (v_inst, p_session, v_student, v_s.batch_id, v_s.session_date, v_status, v_rec ->> 'remarks', auth.uid());
      -- Queue absence notification for linked parents (deduplicated).
      if v_status = 'absent' then
        perform public.queue_absence_notification(v_student, v_s.id);
      end if;
    end if;
    v_count := v_count + 1;
  end loop;

  update public.class_sessions
     set attendance_submitted_at = coalesce(attendance_submitted_at, now()),
         attendance_submitted_by = coalesce(attendance_submitted_by, auth.uid()),
         status = case when status = 'scheduled' then 'completed' else status end
   where id = p_session;
  return v_count;
end $$;

-- Attendance percentage honouring institute policy.
create or replace function public.attendance_summary(p_student uuid, p_from date default null, p_to date default null)
returns table (total_sessions integer, attended integer, absent integer, late integer, excused integer, percentage numeric)
language plpgsql stable security definer set search_path = public as $$
declare v_policy text; v_late_present boolean;
begin
  if not public.can_view_student(p_student) then raise exception 'Not authorized'; end if;
  select s.excused_attendance_policy, s.late_counts_as_present into v_policy, v_late_present
    from public.institute_settings s
    join public.students st on st.institute_id = s.institute_id
   where st.id = p_student;

  return query
  with a as (
    select status from public.attendance
     where student_id = p_student
       and (p_from is null or session_date >= p_from)
       and (p_to is null or session_date <= p_to)
  ), c as (
    select count(*) filter (where status = 'present')::int p,
           count(*) filter (where status = 'absent')::int ab,
           count(*) filter (where status = 'late')::int l,
           count(*) filter (where status = 'excused')::int e
      from a
  )
  select
    (c.p + c.ab + c.l + case when v_policy = 'exclude' then 0 else c.e end),
    (c.p + case when v_late_present then c.l else 0 end + case when v_policy = 'count_present' then c.e else 0 end),
    c.ab, c.l, c.e,
    case when (c.p + c.ab + c.l + case when v_policy = 'exclude' then 0 else c.e end) = 0 then null
         else round(100.0 * (c.p + case when v_late_present then c.l else 0 end + case when v_policy = 'count_present' then c.e else 0 end)
                    / (c.p + c.ab + c.l + case when v_policy = 'exclude' then 0 else c.e end), 2)
    end
  from c;
end $$;

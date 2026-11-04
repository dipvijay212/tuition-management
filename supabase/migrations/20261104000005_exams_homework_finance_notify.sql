-- =====================================================================
-- 0005 EXAMS, HOMEWORK, STUDY MATERIAL, TEACHER HR, FINANCE, NOTIFICATIONS
-- =====================================================================

-- ---------- Examinations ----------
create type public.exam_type as enum ('unit_test', 'weekly_test', 'monthly_test', 'half_yearly', 'final', 'practice');
create type public.exam_status as enum ('draft', 'scheduled', 'marks_entry', 'pending_approval', 'published', 'cancelled');

create table public.grading_rules (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  grade text not null,
  min_percentage numeric(5,2) not null check (min_percentage between 0 and 100),
  max_percentage numeric(5,2) not null check (max_percentage between 0 and 100),
  is_pass boolean not null default true,
  sort_order integer not null default 0,
  check (max_percentage >= min_percentage),
  unique (institute_id, grade)
);

create table public.examinations (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  name text not null,
  class_id uuid references public.classes(id),
  batch_id uuid references public.batches(id),
  academic_year_id uuid references public.academic_years(id),
  exam_type public.exam_type not null,
  start_date date not null,
  end_date date not null,
  result_publish_date date,
  status public.exam_status not null default 'draft',
  published_at timestamptz,
  published_by uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (batch_id is not null or class_id is not null)
);
create index examinations_batch_idx on public.examinations (batch_id);
create trigger trg_examinations_updated before update on public.examinations for each row execute function public.set_updated_at();

create table public.examination_subjects (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  examination_id uuid not null references public.examinations(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  exam_date date,
  max_marks numeric(6,2) not null check (max_marks > 0),
  passing_marks numeric(6,2) not null check (passing_marks >= 0),
  check (passing_marks <= max_marks),
  unique (examination_id, subject_id)
);

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  examination_subject_id uuid not null references public.examination_subjects(id),
  student_id uuid not null references public.students(id),
  obtained_marks numeric(6,2) check (obtained_marks is null or obtained_marks >= 0),
  is_absent boolean not null default false,
  remarks text,
  entered_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (examination_subject_id, student_id),
  check (not (is_absent and obtained_marks is not null))
);
create trigger trg_audit_marks after update on public.marks for each row execute function public.audit_row_change();

-- Validate marks vs max and lock after publication (teachers).
-- SECURITY INVOKER so current_user tells API users apart from trusted functions.
create or replace function public.validate_marks()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_max numeric; v_status public.exam_status;
begin
  select es.max_marks, e.status into v_max, v_status
    from public.examination_subjects es join public.examinations e on e.id = es.examination_id
   where es.id = new.examination_subject_id;
  if new.obtained_marks is not null and new.obtained_marks > v_max then
    raise exception 'Obtained marks (%) cannot exceed maximum marks (%)', new.obtained_marks, v_max;
  end if;
  if v_status = 'published' and public.is_api_user() then
    raise exception 'Results are published. Use an authorized correction to change marks.';
  end if;
  if v_status in ('draft', 'cancelled') then
    raise exception 'Marks cannot be entered for a % examination', v_status;
  end if;
  new.updated_at := now();
  new.entered_by := coalesce(auth.uid(), new.entered_by);
  return new;
end $$;
create trigger trg_marks_validate before insert or update on public.marks for each row execute function public.validate_marks();

create table public.published_results (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  examination_id uuid not null references public.examinations(id),
  student_id uuid not null references public.students(id),
  total_obtained numeric(8,2) not null,
  total_max numeric(8,2) not null,
  percentage numeric(5,2) not null,
  grade text,
  is_pass boolean not null,
  rank integer,
  subject_breakdown jsonb not null,
  published_at timestamptz not null default now(),
  unique (examination_id, student_id)
);

-- Compute & publish results (re-runnable; used for authorized corrections too).
create or replace function public.publish_examination(p_exam uuid, p_reason text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  e public.examinations;
  v_missing integer;
  v_count integer;
begin
  if not public.is_admin() then raise exception 'Only admins can publish results'; end if;
  select * into e from public.examinations where id = p_exam and institute_id = public.auth_institute_id() for update;
  if not found then raise exception 'Examination not found'; end if;
  if e.status = 'cancelled' then raise exception 'Cannot publish a cancelled examination'; end if;
  if e.status = 'published' and coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required to re-publish corrected results';
  end if;

  -- Every enrolled student must have marks or be marked absent for every subject.
  select count(*) into v_missing
    from public.examination_subjects es
    cross join (select distinct sb.student_id from public.student_batches sb
                 where sb.batch_id = e.batch_id and sb.status = 'active') st
    left join public.marks m on m.examination_subject_id = es.id and m.student_id = st.student_id
   where es.examination_id = e.id
     and (m.id is null or (m.obtained_marks is null and not m.is_absent));
  if v_missing > 0 then
    raise exception '% mark entries are missing. Enter marks or mark the student absent.', v_missing;
  end if;

  delete from public.published_results where examination_id = e.id;

  insert into public.published_results (institute_id, examination_id, student_id, total_obtained, total_max,
                                        percentage, grade, is_pass, subject_breakdown)
  select e.institute_id, e.id, m.student_id,
         sum(coalesce(m.obtained_marks, 0)), sum(es.max_marks),
         round(100 * sum(coalesce(m.obtained_marks, 0)) / sum(es.max_marks), 2),
         null,
         bool_and(not m.is_absent and m.obtained_marks >= es.passing_marks),
         jsonb_agg(jsonb_build_object('subject_id', es.subject_id, 'subject', s.name, 'max', es.max_marks,
                   'passing', es.passing_marks, 'obtained', m.obtained_marks, 'absent', m.is_absent,
                   'pass', (not m.is_absent and m.obtained_marks >= es.passing_marks)) order by s.name)
    from public.marks m
    join public.examination_subjects es on es.id = m.examination_subject_id
    join public.subjects s on s.id = es.subject_id
   where es.examination_id = e.id
   group by m.student_id;
  get diagnostics v_count = row_count;

  update public.published_results r
     set grade = g.grade,
         is_pass = r.is_pass and g.is_pass
    from public.grading_rules g
   where r.examination_id = e.id and g.institute_id = e.institute_id
     and r.percentage >= g.min_percentage and r.percentage <= g.max_percentage + 0.009;

  update public.published_results r set rank = x.rnk
    from (select id, rank() over (order by percentage desc) rnk
            from public.published_results where examination_id = e.id) x
   where r.id = x.id;

  update public.examinations set status = 'published', published_at = now(), published_by = auth.uid() where id = e.id;

  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, reason, new_values)
  values (e.institute_id, auth.uid(), case when e.status = 'published' then 'results_republished' else 'results_published' end,
          'examinations', e.id::text, p_reason, jsonb_build_object('students', v_count));

  perform public.notify_student_and_parents(r.student_id, 'result_publication', 'Results published',
            e.name || ' results are now available.', '/results', 'result:' || e.id || ':' || r.student_id || ':' || extract(epoch from now())::bigint)
     from public.published_results r where r.examination_id = e.id;
  return v_count;
end $$;

-- Authorized correction of a published mark (admin, with reason).
create or replace function public.correct_published_mark(p_mark uuid, p_obtained numeric, p_absent boolean, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_exam uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can correct published results'; end if;
  if coalesce(length(trim(p_reason)), 0) < 5 then raise exception 'A clear reason is required'; end if;
  select es.examination_id into v_exam from public.marks m
    join public.examination_subjects es on es.id = m.examination_subject_id
   where m.id = p_mark and m.institute_id = public.auth_institute_id();
  if v_exam is null then raise exception 'Mark not found'; end if;
  update public.marks set obtained_marks = case when p_absent then null else p_obtained end, is_absent = p_absent where id = p_mark;
  perform public.publish_examination(v_exam, p_reason);
end $$;

-- ---------- Homework ----------
create type public.submission_status as enum ('pending', 'submitted', 'late', 'reviewed', 'resubmission_required');

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  batch_id uuid not null references public.batches(id),
  subject_id uuid references public.subjects(id),
  title text not null,
  description text,
  assigned_date date not null default current_date,
  due_at timestamptz not null,
  attachment_paths text[] not null default '{}',
  max_marks numeric(6,2) check (max_marks is null or max_marks > 0),
  submission_enabled boolean not null default true,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index homework_batch_idx on public.homework (batch_id, due_at desc);
create trigger trg_homework_updated before update on public.homework for each row execute function public.set_updated_at();

create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  homework_id uuid not null references public.homework(id),
  student_id uuid not null references public.students(id),
  content text,
  file_paths text[] not null default '{}',
  status public.submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  attempt integer not null default 1,
  marks numeric(6,2),
  feedback text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique (homework_id, student_id)
);

-- ---------- Study materials ----------
create table public.study_materials (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  title text not null,
  description text,
  subject_id uuid references public.subjects(id),
  class_id uuid references public.classes(id),
  batch_id uuid references public.batches(id),
  file_path text not null,
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'batch' check (visibility in ('batch', 'class', 'staff')),
  is_active boolean not null default true,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (visibility = 'staff' or batch_id is not null or class_id is not null)
);

-- ---------- Teacher HR ----------
create type public.teacher_attendance_status as enum ('present', 'absent', 'late', 'leave');

create table public.teacher_attendance (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  attendance_date date not null,
  status public.teacher_attendance_status not null,
  remarks text,
  marked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (teacher_id, attendance_date)
);

-- ---------- Income & expenses ----------
create table public.income_categories (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  unique (institute_id, name)
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  unique (institute_id, name)
);

-- Non-fee income only. Fee receipts are reported from payments, so they are never counted twice.
create table public.income_entries (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  category_id uuid not null references public.income_categories(id),
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  received_date date not null,
  method public.payment_method not null,
  reference text,
  description text,
  recorded_by uuid references public.profiles(id),
  is_void boolean not null default false,
  void_reason text,
  created_at timestamptz not null default now()
);
create trigger trg_audit_income after insert or update on public.income_entries for each row execute function public.audit_row_change();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  category_id uuid not null references public.expense_categories(id),
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null,
  method public.payment_method not null,
  paid_to text,
  description text,
  receipt_path text,
  recorded_by uuid references public.profiles(id),
  is_void boolean not null default false,
  void_reason text,
  created_at timestamptz not null default now(),
  check (not is_void or coalesce(trim(void_reason), '') <> '')
);
create index expenses_inst_date_idx on public.expenses (institute_id, payment_date);
create trigger trg_audit_expenses after insert or update on public.expenses for each row execute function public.audit_row_change();

create table public.teacher_salary_records (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  salary_month date not null check (extract(day from salary_month) = 1),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_on date,
  method public.payment_method,
  remarks text,
  expense_id uuid unique references public.expenses(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (teacher_id, salary_month)
);

-- Pay salary => creates the linked expense atomically.
create or replace function public.pay_teacher_salary(p_record uuid, p_paid_on date, p_method public.payment_method, p_remarks text)
returns uuid language plpgsql security definer set search_path = public as $$
declare r public.teacher_salary_records; v_cat uuid; v_exp uuid; v_name text;
begin
  if not public.is_admin() then raise exception 'Only admins can pay salaries'; end if;
  select * into r from public.teacher_salary_records where id = p_record and institute_id = public.auth_institute_id() for update;
  if not found then raise exception 'Salary record not found'; end if;
  if r.status = 'paid' then raise exception 'Salary already paid'; end if;
  select id into v_cat from public.expense_categories where institute_id = r.institute_id and name = 'Teacher Salary';
  select full_name into v_name from public.teachers where id = r.teacher_id;
  insert into public.expenses (institute_id, category_id, title, amount, payment_date, method, paid_to, description, recorded_by)
  values (r.institute_id, v_cat, 'Salary – ' || to_char(r.salary_month, 'Mon YYYY'), r.amount, p_paid_on, p_method, v_name, p_remarks, auth.uid())
  returning id into v_exp;
  update public.teacher_salary_records set status = 'paid', paid_on = p_paid_on, method = p_method,
         remarks = coalesce(p_remarks, remarks), expense_id = v_exp where id = r.id;
  return v_exp;
end $$;

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  in_app boolean not null default true,
  email boolean not null default true,
  push boolean not null default true,
  whatsapp boolean not null default false,
  primary key (user_id, type)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null check (audience in ('all', 'staff', 'students_parents', 'batch')),
  batch_id uuid references public.batches(id),
  is_important boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  check (audience <> 'batch' or batch_id is not null)
);

create table public.notification_delivery_logs (
  id bigint generated always as identity primary key,
  institute_id uuid references public.institutes(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  channel text not null check (channel in ('in_app', 'email', 'push', 'whatsapp')),
  recipient text,
  status text not null check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now()
);

-- Non-essential types users may switch off. Essential ones always go through in-app.
create or replace function public.is_essential_notification(p_type text)
returns boolean language sql immutable as $$
  select p_type in ('payment_confirmation', 'result_publication', 'class_cancellation', 'admission_confirmation')
$$;

create or replace function public.notify_user(p_user uuid, p_type text, p_title text, p_body text, p_link text, p_dedupe text)
returns void language plpgsql security definer set search_path = public as $$
declare v_inst uuid;
begin
  if p_user is null then return; end if;
  if not public.is_essential_notification(p_type) and exists (
    select 1 from public.notification_preferences where user_id = p_user and type = p_type and not in_app) then
    return;
  end if;
  select institute_id into v_inst from public.profiles where id = p_user;
  if v_inst is null then return; end if;
  insert into public.notifications (institute_id, user_id, type, title, body, link, dedupe_key)
  values (v_inst, p_user, p_type, p_title, p_body, p_link, p_dedupe)
  on conflict (user_id, dedupe_key) do nothing;
end $$;
revoke all on function public.notify_user(uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.notify_student_and_parents(p_student uuid, p_type text, p_title text, p_body text, p_link text, p_dedupe text)
returns void language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  for u in
    select s.profile_id from public.students s where s.id = p_student and s.profile_id is not null
    union
    select g.profile_id from public.parent_students ps join public.guardians g on g.id = ps.guardian_id
     where ps.student_id = p_student and g.profile_id is not null
  loop
    perform public.notify_user(u, p_type, p_title, p_body, p_link, p_dedupe);
  end loop;
end $$;
revoke all on function public.notify_student_and_parents(uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.queue_absence_notification(p_student uuid, p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_on boolean; v_name text; v_date date; v_batch text;
begin
  select st.notify_parent_on_absence into v_on from public.institute_settings st
    join public.students s on s.institute_id = st.institute_id where s.id = p_student;
  if not coalesce(v_on, false) then return; end if;
  select s.full_name into v_name from public.students s where s.id = p_student;
  select cs.session_date, b.name into v_date, v_batch from public.class_sessions cs
    join public.batches b on b.id = cs.batch_id where cs.id = p_session;
  perform public.notify_student_and_parents(p_student, 'attendance_absence', 'Absent from class',
    v_name || ' was marked absent in ' || v_batch || ' on ' || to_char(v_date, 'DD Mon YYYY') || '.',
    '/attendance', 'absent:' || p_session || ':' || p_student);
end $$;
revoke all on function public.queue_absence_notification(uuid, uuid) from public, anon, authenticated;

-- Announcement fan-out into in-app notifications.
create or replace function public.fanout_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  for u in
    select p.id from public.profiles p
     where p.institute_id = new.institute_id and p.status = 'active' and p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
       and (
         new.audience = 'all'
         or (new.audience = 'staff' and exists (select 1 from public.user_roles r where r.user_id = p.id and r.role in ('admin', 'teacher')))
         or (new.audience = 'students_parents' and exists (select 1 from public.user_roles r where r.user_id = p.id and r.role in ('student', 'parent')))
         or (new.audience = 'batch' and (
               p.id in (select s.profile_id from public.student_batches sb join public.students s on s.id = sb.student_id
                         where sb.batch_id = new.batch_id and sb.status = 'active')
            or p.id in (select g.profile_id from public.student_batches sb
                          join public.parent_students ps on ps.student_id = sb.student_id
                          join public.guardians g on g.id = ps.guardian_id
                         where sb.batch_id = new.batch_id and sb.status = 'active')
            or p.id in (select t.profile_id from public.teacher_batches tb join public.teachers t on t.id = tb.teacher_id
                         where tb.batch_id = new.batch_id and tb.is_active)))
       )
  loop
    perform public.notify_user(u, 'general_announcement', new.title, left(new.body, 280), '/notifications', 'ann:' || new.id);
  end loop;
  return new;
end $$;
create trigger trg_announcements_fanout after insert on public.announcements
  for each row execute function public.fanout_announcement();

-- Homework notification fan-out.
create or replace function public.fanout_homework()
returns trigger language plpgsql security definer set search_path = public as $$
declare s uuid;
begin
  if not new.is_published then return new; end if;
  if tg_op = 'UPDATE' and old.is_published then return new; end if;
  for s in select sb.student_id from public.student_batches sb where sb.batch_id = new.batch_id and sb.status = 'active' loop
    perform public.notify_student_and_parents(s, 'homework_assignment', 'New homework: ' || new.title,
      'Due ' || to_char(new.due_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'), '/homework', 'hw:' || new.id || ':' || s);
  end loop;
  return new;
end $$;
create trigger trg_homework_fanout after insert or update of is_published on public.homework
  for each row execute function public.fanout_homework();

-- Class cancellation notification.
create or replace function public.notify_session_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare s uuid; v_batch text;
begin
  if new.status = old.status or new.status not in ('cancelled', 'rescheduled') then return new; end if;
  select name into v_batch from public.batches where id = new.batch_id;
  for s in select sb.student_id from public.student_batches sb where sb.batch_id = new.batch_id and sb.status = 'active' loop
    perform public.notify_student_and_parents(s, case when new.status = 'cancelled' then 'class_cancellation' else 'timetable_change' end,
      case when new.status = 'cancelled' then 'Class cancelled' else 'Class rescheduled' end,
      v_batch || ' on ' || to_char(new.session_date, 'DD Mon YYYY') || coalesce(': ' || new.cancel_reason, ''),
      '/timetable', 'session:' || new.id || ':' || new.status || ':' || s);
  end loop;
  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, old_values, new_values, reason)
  values (new.institute_id, auth.uid(), 'session_' || new.status, 'class_sessions', new.id::text,
          jsonb_build_object('status', old.status), jsonb_build_object('status', new.status), new.cancel_reason);
  return new;
end $$;
create trigger trg_session_change after update of status on public.class_sessions
  for each row execute function public.notify_session_change();

-- Scheduled: fee reminders (idempotent through dedupe keys).
create or replace function public.send_fee_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare o record; v_today date; v_kind text; v_count integer := 0;
begin
  for o in
    select fo.*, st.timezone, st.fee_reminder_days_before, st.fee_reminder_on_due, st.fee_reminder_days_after
      from public.fee_obligations fo
      join public.institute_settings st on st.institute_id = fo.institute_id
      join public.students s on s.id = fo.student_id and s.status = 'active'
     where fo.status in ('unpaid', 'partially_paid')
  loop
    v_today := (now() at time zone o.timezone)::date;
    v_kind := case
      when (o.due_date - v_today) = any(o.fee_reminder_days_before) then 'before'
      when o.due_date = v_today and o.fee_reminder_on_due then 'due'
      when (v_today - o.due_date) = any(o.fee_reminder_days_after) then 'after'
    end;
    continue when v_kind is null;
    perform public.notify_student_and_parents(o.student_id, 'fee_reminder',
      case v_kind when 'after' then 'Fee overdue' else 'Fee reminder' end,
      o.description || ': ₹' || to_char(o.net_amount - o.amount_paid, 'FM99,99,99,990.00') || ' due on ' || to_char(o.due_date, 'DD Mon YYYY'),
      '/fees', 'fee:' || o.id || ':' || v_kind || ':' || v_today);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke all on function public.send_fee_reminders() from public, anon, authenticated;

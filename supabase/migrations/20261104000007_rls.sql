-- =====================================================================
-- 0007 ROW LEVEL SECURITY, GRANTS, STORAGE
-- =====================================================================

-- ---------- Function execution: never anonymous ----------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
-- Internal-only helpers (callable from other definer functions / service role)
revoke execute on function public.next_sequence_value(uuid, text) from authenticated;
revoke execute on function public.notify_user(uuid, text, text, text, text, text) from authenticated;
revoke execute on function public.notify_student_and_parents(uuid, text, text, text, text, text) from authenticated;
revoke execute on function public.queue_absence_notification(uuid, uuid) from authenticated;
revoke execute on function public.seed_institute_defaults(uuid) from authenticated;
revoke execute on function public.send_fee_reminders() from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------- Enable RLS everywhere ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Anonymous users get nothing from any table.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- ---------- Admin: read + write (no delete) on operational tables ----------
do $$
declare t text;
begin
  foreach t in array array[
    'academic_years','classes','subjects','teachers','batches','teacher_batches','batch_subjects',
    'students','student_documents','guardians','parent_students','student_batches',
    'timetable','class_sessions','fee_structures','discounts','fee_obligations',
    'examinations','examination_subjects','marks','grading_rules',
    'homework','homework_submissions','study_materials',
    'teacher_attendance','teacher_salary_records',
    'income_categories','expense_categories','income_entries','expenses','announcements'
  ] loop
    execute format($f$create policy admin_select on public.%I for select to authenticated
                       using (public.is_admin() and institute_id = public.auth_institute_id())$f$, t);
    execute format($f$create policy admin_insert on public.%I for insert to authenticated
                       with check (public.is_admin() and institute_id = public.auth_institute_id())$f$, t);
    execute format($f$create policy admin_update on public.%I for update to authenticated
                       using (public.is_admin() and institute_id = public.auth_institute_id())
                       with check (public.is_admin() and institute_id = public.auth_institute_id())$f$, t);
  end loop;
end $$;

-- Admin delete only for configuration/link rows (never history or money).
create policy admin_delete on public.batch_subjects for delete to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());
create policy admin_delete on public.grading_rules for delete to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());
create policy admin_delete on public.examination_subjects for delete to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());
create policy admin_delete on public.discounts for delete to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());
create policy admin_delete on public.student_documents for delete to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());

-- ---------- Admin: read-only (writes only through audited functions) ----------
do $$
declare t text;
begin
  foreach t in array array['student_fee_assignments','payments','payment_allocations','payment_reversals','receipts',
                           'published_results','student_status_history','audit_logs','notification_delivery_logs'] loop
    execute format($f$create policy admin_select on public.%I for select to authenticated
                       using (public.is_admin() and institute_id = public.auth_institute_id())$f$, t);
  end loop;
end $$;

-- ---------- Institute & settings ----------
create policy member_select on public.institutes for select to authenticated using (id = public.auth_institute_id());
create policy admin_update on public.institutes for update to authenticated
  using (public.is_admin() and id = public.auth_institute_id()) with check (id = public.auth_institute_id());
create policy member_select on public.institute_settings for select to authenticated using (institute_id = public.auth_institute_id());
create policy admin_update on public.institute_settings for update to authenticated
  using (public.is_admin() and institute_id = public.auth_institute_id()) with check (institute_id = public.auth_institute_id());

-- ---------- Profiles & roles ----------
-- Own profile is readable even when not active, so the app can show "account suspended".
create policy own_select on public.profiles for select to authenticated using (id = auth.uid());
create policy own_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy admin_select on public.profiles for select to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());
create policy admin_update on public.profiles for update to authenticated
  using (public.is_admin() and institute_id = public.auth_institute_id()) with check (institute_id = public.auth_institute_id());
create policy own_select on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy admin_select_roles on public.user_roles for select to authenticated using (public.is_admin() and institute_id = public.auth_institute_id());
-- user_roles writes: service role only (server actions after admin check). Users can never change their own roles.

-- ---------- Shared reference data (any active member) ----------
create policy member_select on public.academic_years for select to authenticated using (institute_id = public.auth_institute_id());
create policy member_select on public.classes for select to authenticated using (institute_id = public.auth_institute_id());
create policy member_select on public.subjects for select to authenticated using (institute_id = public.auth_institute_id());
create policy member_select on public.batches for select to authenticated using (institute_id = public.auth_institute_id());
create policy member_select on public.batch_subjects for select to authenticated using (institute_id = public.auth_institute_id());
create policy member_select on public.grading_rules for select to authenticated using (institute_id = public.auth_institute_id());

-- Non-private teacher directory (names only) for timetables etc.
create view public.staff_directory as
  select t.id, t.institute_id, t.full_name, t.specialization
    from public.teachers t
   where t.institute_id = public.auth_institute_id() and t.employment_status in ('active', 'on_leave');
grant select on public.staff_directory to authenticated;
revoke all on public.staff_directory from anon;

-- ---------- Teachers ----------
create policy own_select on public.teachers for select to authenticated using (profile_id = auth.uid());
create policy teacher_select on public.teacher_batches for select to authenticated using (teacher_id = public.my_teacher_id());
create policy own_select on public.teacher_attendance for select to authenticated using (teacher_id = public.my_teacher_id());
create policy own_select on public.teacher_salary_records for select to authenticated using (teacher_id = public.my_teacher_id());

-- ---------- Students & family ----------
create policy viewer_select on public.students for select to authenticated using (public.can_view_student(id));
create policy viewer_select on public.student_batches for select to authenticated using (public.can_view_student(student_id));
create policy family_select on public.student_documents for select to authenticated using (student_id in (select public.my_student_ids()));
create policy family_select on public.parent_students for select to authenticated using (student_id in (select public.my_student_ids()));
create policy viewer_select on public.guardians for select to authenticated using (
  profile_id = auth.uid()
  or exists (select 1 from public.parent_students ps where ps.guardian_id = guardians.id and public.can_view_student(ps.student_id)));
create policy own_update on public.guardians for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------- Timetable, sessions, attendance ----------
create policy staff_select on public.timetable for select to authenticated
  using (institute_id = public.auth_institute_id() and public.has_role('teacher'));
create policy family_select on public.timetable for select to authenticated
  using (batch_id in (select public.my_student_batch_ids()));
create policy staff_select on public.class_sessions for select to authenticated
  using (institute_id = public.auth_institute_id() and public.has_role('teacher'));
create policy family_select on public.class_sessions for select to authenticated
  using (batch_id in (select public.my_student_batch_ids()));
create policy viewer_select on public.attendance for select to authenticated using (public.can_view_student(student_id));
-- attendance writes only via submit_attendance().

-- ---------- Fees (family read-only) ----------
create policy family_select on public.student_fee_assignments for select to authenticated using (student_id in (select public.my_student_ids()));
create policy family_select on public.fee_obligations for select to authenticated using (student_id in (select public.my_student_ids()));
create policy family_select on public.payments for select to authenticated using (student_id in (select public.my_student_ids()));
create policy family_select on public.payment_allocations for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and p.student_id in (select public.my_student_ids())));
create policy family_select on public.payment_reversals for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and p.student_id in (select public.my_student_ids())));
create policy family_select on public.receipts for select to authenticated
  using (exists (select 1 from public.payments p where p.id = payment_id and p.student_id in (select public.my_student_ids())));

-- ---------- Examinations ----------
create policy teacher_select on public.examinations for select to authenticated
  using (public.has_role('teacher') and batch_id in (select public.my_batch_ids()));
create policy teacher_insert on public.examinations for insert to authenticated
  with check (public.has_role('teacher') and institute_id = public.auth_institute_id()
              and batch_id in (select public.my_batch_ids()) and status in ('draft', 'scheduled'));
create policy teacher_update on public.examinations for update to authenticated
  using (public.has_role('teacher') and batch_id in (select public.my_batch_ids()) and status <> 'published')
  with check (batch_id in (select public.my_batch_ids()) and status in ('draft', 'scheduled', 'marks_entry', 'pending_approval'));
create policy family_select on public.examinations for select to authenticated
  using (batch_id in (select public.my_student_batch_ids()) and status in ('scheduled', 'marks_entry', 'pending_approval', 'published'));

create policy exam_visible_select on public.examination_subjects for select to authenticated
  using (exists (select 1 from public.examinations e where e.id = examination_id));  -- inherits examinations RLS
create policy teacher_write on public.examination_subjects for insert to authenticated
  with check (exists (select 1 from public.examinations e where e.id = examination_id
                       and e.batch_id in (select public.my_batch_ids()) and e.status <> 'published'));
create policy teacher_update on public.examination_subjects for update to authenticated
  using (exists (select 1 from public.examinations e where e.id = examination_id
                  and e.batch_id in (select public.my_batch_ids()) and e.status <> 'published'));

create policy teacher_select on public.marks for select to authenticated
  using (exists (select 1 from public.examination_subjects es join public.examinations e on e.id = es.examination_id
                  where es.id = examination_subject_id and e.batch_id in (select public.my_batch_ids())));
create policy teacher_insert on public.marks for insert to authenticated
  with check (public.teacher_can_access_student(student_id) and exists (
    select 1 from public.examination_subjects es join public.examinations e on e.id = es.examination_id
     where es.id = examination_subject_id and e.batch_id in (select public.my_batch_ids())));
create policy teacher_update on public.marks for update to authenticated
  using (exists (select 1 from public.examination_subjects es join public.examinations e on e.id = es.examination_id
                  where es.id = examination_subject_id and e.batch_id in (select public.my_batch_ids())));

create policy viewer_select on public.published_results for select to authenticated using (public.can_view_student(student_id));

-- ---------- Homework ----------
create policy teacher_all on public.homework for select to authenticated
  using (public.has_role('teacher') and batch_id in (select public.my_batch_ids()));
create policy teacher_insert on public.homework for insert to authenticated
  with check (public.has_role('teacher') and institute_id = public.auth_institute_id() and batch_id in (select public.my_batch_ids()));
create policy teacher_update on public.homework for update to authenticated
  using (public.has_role('teacher') and batch_id in (select public.my_batch_ids()))
  with check (batch_id in (select public.my_batch_ids()));
create policy family_select on public.homework for select to authenticated
  using (is_published and batch_id in (select public.my_student_batch_ids()));

create policy teacher_select on public.homework_submissions for select to authenticated
  using (exists (select 1 from public.homework h where h.id = homework_id and h.batch_id in (select public.my_batch_ids())));
create policy teacher_update on public.homework_submissions for update to authenticated
  using (exists (select 1 from public.homework h where h.id = homework_id and h.batch_id in (select public.my_batch_ids())));
create policy family_select on public.homework_submissions for select to authenticated
  using (student_id in (select public.my_student_ids()));
create policy student_insert on public.homework_submissions for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));
create policy student_update on public.homework_submissions for update to authenticated
  using (exists (select 1 from public.students s where s.id = student_id and s.profile_id = auth.uid()));

-- Submission guard: students can't grade themselves; late/deadline rules.
create or replace function public.guard_homework_submission()
returns trigger language plpgsql security definer set search_path = public as $$
declare h public.homework; v_is_student boolean; v_allow_late boolean;
begin
  select * into h from public.homework where id = new.homework_id;
  v_is_student := exists (select 1 from public.students s where s.id = new.student_id and s.profile_id = auth.uid());
  if v_is_student and not public.is_admin() then
    if not h.submission_enabled then raise exception 'Online submission is not enabled for this homework'; end if;
    if tg_op = 'UPDATE' then
      if old.status not in ('resubmission_required', 'submitted', 'late') then
        raise exception 'This submission has already been reviewed';
      end if;
      new.marks := old.marks; new.feedback := old.feedback; new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
      new.attempt := old.attempt + case when old.status = 'resubmission_required' then 1 else 0 end;
    else
      new.marks := null; new.feedback := null; new.reviewed_by := null; new.reviewed_at := null; new.attempt := 1;
    end if;
    select allow_late_submission into v_allow_late from public.institute_settings where institute_id = h.institute_id;
    if now() > h.due_at and not v_allow_late then raise exception 'The submission deadline has passed'; end if;
    new.submitted_at := now();
    new.status := case when now() > h.due_at then 'late' else 'submitted' end;
    new.institute_id := h.institute_id;
  else
    -- Staff review
    if new.marks is not null and h.max_marks is not null and new.marks > h.max_marks then
      raise exception 'Marks cannot exceed %', h.max_marks;
    end if;
    if new.status in ('reviewed', 'resubmission_required') then
      new.reviewed_by := auth.uid(); new.reviewed_at := now();
    end if;
  end if;
  return new;
end $$;
create trigger trg_homework_submission_guard before insert or update on public.homework_submissions
  for each row execute function public.guard_homework_submission();

-- ---------- Study materials ----------
create policy teacher_select on public.study_materials for select to authenticated
  using (public.has_role('teacher') and institute_id = public.auth_institute_id()
         and (uploaded_by = auth.uid() or batch_id in (select public.my_batch_ids()) or visibility in ('class', 'staff')));
create policy teacher_insert on public.study_materials for insert to authenticated
  with check (public.has_role('teacher') and institute_id = public.auth_institute_id() and uploaded_by = auth.uid()
              and (batch_id is null or batch_id in (select public.my_batch_ids())));
create policy teacher_update on public.study_materials for update to authenticated
  using (public.has_role('teacher') and uploaded_by = auth.uid());
create policy family_select on public.study_materials for select to authenticated
  using (is_active and visibility <> 'staff' and (
    batch_id in (select public.my_student_batch_ids())
    or (visibility = 'class' and batch_id is null and class_id in (
          select s.class_id from public.students s where s.id in (select public.my_student_ids())))));

-- ---------- Announcements & notifications ----------
create policy viewer_select on public.announcements for select to authenticated using (
  institute_id = public.auth_institute_id() and (
    audience = 'all'
    or (audience = 'staff' and (public.is_admin() or public.has_role('teacher')))
    or (audience = 'students_parents' and (public.has_role('student') or public.has_role('parent')))
    or (audience = 'batch' and (batch_id in (select public.my_batch_ids()) or batch_id in (select public.my_student_batch_ids())))
  ));
create policy teacher_insert on public.announcements for insert to authenticated
  with check (public.has_role('teacher') and institute_id = public.auth_institute_id()
              and audience = 'batch' and batch_id in (select public.my_batch_ids()) and created_by = auth.uid());

create policy own_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy own_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_all on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Only read_at may change on a notification.
create or replace function public.guard_notification_update()
returns trigger language plpgsql as $$
begin
  if new.title <> old.title or new.body is distinct from old.body or new.user_id <> old.user_id or new.type <> old.type then
    raise exception 'Notifications are read-only';
  end if;
  return new;
end $$;
create trigger trg_notifications_guard before update on public.notifications for each row execute function public.guard_notification_update();

-- =====================================================================
-- STORAGE
-- Private bucket "files": {institute_id}/{area}/... ; public bucket "branding" for logos.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('files', 'files', false, 26214400, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'])
on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Central read check for private files.
create or replace function public.can_read_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/');
begin
  if parts[1] is distinct from public.auth_institute_id()::text then return false; end if;
  if public.is_admin() then return true; end if;
  case parts[2]
    when 'materials' then
      return exists (select 1 from public.study_materials m where m.file_path = p_name); -- RLS of caller applies? no: definer
    when 'homework' then
      return exists (select 1 from public.homework h where p_name = any(h.attachment_paths)
                      and (h.batch_id in (select public.my_batch_ids()) or (h.is_published and h.batch_id in (select public.my_student_batch_ids()))));
    when 'submissions' then
      return parts[4]::uuid in (select public.my_student_ids())
          or exists (select 1 from public.homework h where h.id = parts[3]::uuid and h.batch_id in (select public.my_batch_ids()));
    when 'students' then
      return parts[3]::uuid in (select public.my_student_ids())
          or (public.has_role('teacher') and public.teacher_can_access_student(parts[3]::uuid));
    when 'teachers' then
      return exists (select 1 from public.teachers t where t.id = parts[3]::uuid and t.profile_id = auth.uid());
    else
      return false;
  end case;
exception when invalid_text_representation then
  return false;
end $$;

-- Materials need the same visibility rules as the table.
create or replace function public.can_read_material_file(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.study_materials m
     where m.file_path = p_name and m.institute_id = public.auth_institute_id()
       and (
         public.is_admin()
         or (public.has_role('teacher') and (m.uploaded_by = auth.uid() or m.batch_id in (select public.my_batch_ids()) or m.visibility in ('class', 'staff')))
         or (m.is_active and m.visibility <> 'staff' and (
               m.batch_id in (select public.my_student_batch_ids())
               or (m.visibility = 'class' and m.batch_id is null and m.class_id in (
                     select s.class_id from public.students s where s.id in (select public.my_student_ids())))))
       ))
$$;

create or replace function public.can_write_file(p_name text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare parts text[] := string_to_array(p_name, '/');
begin
  if parts[1] is distinct from public.auth_institute_id()::text then return false; end if;
  if public.is_admin() then return true; end if;
  if parts[2] in ('materials', 'homework') then return public.has_role('teacher'); end if;
  if parts[2] = 'submissions' then
    return exists (select 1 from public.students s where s.id = parts[4]::uuid and s.profile_id = auth.uid())
       and exists (select 1 from public.homework h where h.id = parts[3]::uuid and h.is_published
                    and h.batch_id in (select public.my_student_batch_ids()));
  end if;
  return false;
exception when invalid_text_representation then
  return false;
end $$;

create policy files_read on storage.objects for select to authenticated
  using (bucket_id = 'files' and (
    case when (storage.foldername(name))[2] = 'materials' then public.can_read_material_file(name)
         else public.can_read_file(name) end));
create policy files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'files' and public.can_write_file(name));
create policy files_update on storage.objects for update to authenticated
  using (bucket_id = 'files' and public.is_admin() and (storage.foldername(name))[1] = public.auth_institute_id()::text);
create policy files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'files' and public.is_admin() and (storage.foldername(name))[1] = public.auth_institute_id()::text);

create policy branding_read on storage.objects for select using (bucket_id = 'branding');
create policy branding_write on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and public.is_admin() and (storage.foldername(name))[1] = public.auth_institute_id()::text);
create policy branding_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and public.is_admin() and (storage.foldername(name))[1] = public.auth_institute_id()::text);

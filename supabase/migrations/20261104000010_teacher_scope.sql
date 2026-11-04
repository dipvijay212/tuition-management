-- =====================================================================
-- 0010 Tighten teacher visibility to assigned batches only (SOP 2.2)
-- =====================================================================
drop policy if exists staff_select on public.timetable;
drop policy if exists staff_select on public.class_sessions;

create policy teacher_select on public.timetable for select to authenticated
  using (public.has_role('teacher') and (batch_id in (select public.my_batch_ids()) or teacher_id = public.my_teacher_id()));
create policy teacher_select on public.class_sessions for select to authenticated
  using (public.has_role('teacher') and (batch_id in (select public.my_batch_ids()) or teacher_id = public.my_teacher_id()));

-- Teacher dashboard summary (own scope only).
create or replace function public.teacher_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_t uuid := public.my_teacher_id();
  v_tz text;
  v_today date;
begin
  if v_t is null or not public.has_role('teacher') then raise exception 'Not authorized'; end if;
  select timezone into v_tz from public.institute_settings where institute_id = public.auth_institute_id();
  v_today := (now() at time zone v_tz)::date;
  return jsonb_build_object(
    'today', v_today,
    'batches', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'name', b.name, 'class', c.name, 'start', b.start_time, 'end', b.end_time, 'days', b.class_days,
                  'students', (select count(*) from student_batches sb where sb.batch_id = b.id and sb.status = 'active')) order by b.name), '[]'::jsonb)
                  from batches b join classes c on c.id = b.class_id where b.id in (select my_batch_ids()) and b.status = 'active'),
    'total_students', (select count(distinct sb.student_id) from student_batches sb where sb.batch_id in (select my_batch_ids()) and sb.status = 'active'),
    'today_classes', (select coalesce(jsonb_agg(jsonb_build_object('id', cs.id, 'batch', b.name, 'subject', su.name, 'start', cs.start_time, 'end', cs.end_time,
                  'room', cs.room, 'status', cs.status, 'marked', cs.attendance_submitted_at is not null) order by cs.start_time), '[]'::jsonb)
                  from class_sessions cs join batches b on b.id = cs.batch_id left join subjects su on su.id = cs.subject_id
                 where cs.session_date = v_today and (cs.batch_id in (select my_batch_ids()) or cs.teacher_id = v_t)),
    'pending_attendance', (select count(*) from class_sessions cs
                 where (cs.batch_id in (select my_batch_ids()) or cs.teacher_id = v_t) and cs.status = 'scheduled'
                   and cs.attendance_submitted_at is null and cs.session_date between v_today - 7 and v_today),
    'upcoming_exams', (select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'start', e.start_date, 'batch', b.name, 'status', e.status) order by e.start_date), '[]'::jsonb)
                 from examinations e join batches b on b.id = e.batch_id
                where e.batch_id in (select my_batch_ids()) and e.status in ('draft', 'scheduled', 'marks_entry') and e.end_date >= v_today),
    'homework_count', (select count(*) from homework h where h.batch_id in (select my_batch_ids()) and h.due_at >= now()),
    'recent_results', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                 select jsonb_build_object('exam', e.name, 'batch', b.name, 'avg', round(avg(r.percentage), 1),
                        'pass_rate', round(100.0 * count(*) filter (where r.is_pass) / count(*), 1), 'students', count(*)) x
                   from published_results r join examinations e on e.id = r.examination_id join batches b on b.id = e.batch_id
                  where e.batch_id in (select my_batch_ids()) group by e.id, e.name, b.name, e.published_at order by e.published_at desc limit 5) q)
  );
end $$;
grant execute on function public.teacher_dashboard() to authenticated;

-- Student/parent dashboard summary for one visible student.
create or replace function public.family_dashboard(p_student uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_tz text; v_today date; v_att record;
begin
  if p_student not in (select public.my_student_ids()) then raise exception 'Not authorized'; end if;
  select timezone into v_tz from public.institute_settings where institute_id = public.auth_institute_id();
  v_today := (now() at time zone v_tz)::date;
  select * into v_att from public.attendance_summary(p_student);
  return jsonb_build_object(
    'today', v_today,
    'student', (select jsonb_build_object('id', s.id, 'name', s.full_name, 'admission_no', s.admission_no, 'class', c.name, 'status', s.status)
                  from students s left join classes c on c.id = s.class_id where s.id = p_student),
    'attendance', jsonb_build_object('percentage', v_att.percentage, 'total', v_att.total_sessions, 'attended', v_att.attended, 'absent', v_att.absent),
    'fees', (select jsonb_build_object('outstanding', coalesce(sum(net_amount - amount_paid), 0),
                    'overdue', coalesce(sum(net_amount - amount_paid) filter (where due_date < v_today), 0),
                    'next_due', min(due_date) filter (where due_date >= v_today))
               from fee_obligations where student_id = p_student and status in ('unpaid', 'partially_paid')),
    'upcoming_classes', (select coalesce(jsonb_agg(jsonb_build_object('date', cs.session_date, 'batch', b.name, 'subject', su.name, 'start', cs.start_time, 'end', cs.end_time, 'status', cs.status) order by cs.session_date, cs.start_time), '[]'::jsonb)
               from (select * from class_sessions where batch_id in (select batch_id from student_batches where student_id = p_student and status = 'active')
                       and session_date between v_today and v_today + 6 order by session_date, start_time limit 8) cs
               join batches b on b.id = cs.batch_id left join subjects su on su.id = cs.subject_id),
    'pending_homework', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'due', h.due_at, 'subject', su.name) order by h.due_at), '[]'::jsonb)
               from homework h left join subjects su on su.id = h.subject_id
              where h.is_published and h.batch_id in (select batch_id from student_batches where student_id = p_student and status = 'active')
                and h.due_at >= now() - interval '7 days'
                and not exists (select 1 from homework_submissions hs where hs.homework_id = h.id and hs.student_id = p_student and hs.status in ('submitted', 'late', 'reviewed'))),
    'recent_results', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
               select jsonb_build_object('exam', e.name, 'percentage', r.percentage, 'grade', r.grade, 'pass', r.is_pass, 'rank', r.rank) x
                 from published_results r join examinations e on e.id = r.examination_id where r.student_id = p_student order by r.published_at desc limit 5) q),
    'upcoming_exams', (select coalesce(jsonb_agg(jsonb_build_object('name', e.name, 'start', e.start_date) order by e.start_date), '[]'::jsonb)
               from examinations e where e.batch_id in (select batch_id from student_batches where student_id = p_student and status = 'active')
                and e.status in ('scheduled', 'marks_entry') and e.start_date >= v_today)
  );
end $$;
grant execute on function public.family_dashboard(uuid) to authenticated;

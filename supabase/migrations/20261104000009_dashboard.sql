-- =====================================================================
-- 0009 DASHBOARD & REPORTING FUNCTIONS
-- Reporting basis (documented for the institute):
--   * Fee collection = payments received (by payment_date)
--                      minus reversals (by reversal date, institute timezone).
--   * Outstanding    = obligations not paid/waived/cancelled: net - paid.
--   * Expenses       = non-void expenses by payment_date.
--   * Other income   = non-void income_entries (fees are never double counted).
--   Unpaid obligations are never treated as received cash.
-- =====================================================================

create or replace function public.admin_dashboard(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_inst uuid := public.auth_institute_id();
  v_tz text;
  v_today date;
  v_month_start date;
  r jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_to < p_from or p_to - p_from > 731 then raise exception 'Invalid date range (max 2 years)'; end if;
  select timezone into v_tz from public.institute_settings where institute_id = v_inst;
  v_today := (now() at time zone v_tz)::date;
  v_month_start := date_trunc('month', v_today)::date;

  with
  pay as (select payment_date d, amount from public.payments where institute_id = v_inst),
  rev as (select (reversed_at at time zone v_tz)::date d, amount from public.payment_reversals where institute_id = v_inst),
  exp as (select payment_date d, amount from public.expenses where institute_id = v_inst and not is_void),
  inc as (select received_date d, amount from public.income_entries where institute_id = v_inst and not is_void),
  months as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date m
  ),
  today_att as (
    select a.status from public.attendance a where a.institute_id = v_inst and a.session_date = v_today
  )
  select jsonb_build_object(
    'today', v_today,
    'cards', jsonb_build_object(
      'total_students', (select count(*) from public.students where institute_id = v_inst),
      'active_students', (select count(*) from public.students where institute_id = v_inst and status = 'active'),
      'total_teachers', (select count(*) from public.teachers where institute_id = v_inst and employment_status in ('active', 'on_leave')),
      'total_classes', (select count(*) from public.classes where institute_id = v_inst and status = 'active'),
      'total_batches', (select count(*) from public.batches where institute_id = v_inst and status = 'active'),
      'today_present', (select count(*) from today_att where status in ('present', 'late')),
      'today_absent', (select count(*) from today_att where status = 'absent'),
      'pending_fees', (select coalesce(sum(net_amount - amount_paid), 0) from public.fee_obligations
                        where institute_id = v_inst and status in ('unpaid', 'partially_paid')),
      'overdue_fees', (select coalesce(sum(net_amount - amount_paid), 0) from public.fee_obligations
                        where institute_id = v_inst and status in ('unpaid', 'partially_paid') and due_date < v_today),
      'today_collection', (select coalesce(sum(amount), 0) from pay where d = v_today) - (select coalesce(sum(amount), 0) from rev where d = v_today),
      'month_collection', (select coalesce(sum(amount), 0) from pay where d >= v_month_start and d <= v_today) - (select coalesce(sum(amount), 0) from rev where d >= v_month_start and d <= v_today),
      'month_expenses', (select coalesce(sum(amount), 0) from exp where d >= v_month_start and d <= v_today),
      'range_collection', (select coalesce(sum(amount), 0) from pay where d between p_from and p_to) - (select coalesce(sum(amount), 0) from rev where d between p_from and p_to),
      'range_expenses', (select coalesce(sum(amount), 0) from exp where d between p_from and p_to),
      'range_other_income', (select coalesce(sum(amount), 0) from inc where d between p_from and p_to)
    ),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(m, 'Mon YY'),
        'collection', (select coalesce(sum(amount), 0) from pay where date_trunc('month', d) = m and d between p_from and p_to)
                    - (select coalesce(sum(amount), 0) from rev where date_trunc('month', d) = m and d between p_from and p_to),
        'other_income', (select coalesce(sum(amount), 0) from inc where date_trunc('month', d) = m and d between p_from and p_to),
        'expenses', (select coalesce(sum(amount), 0) from exp where date_trunc('month', d) = m and d between p_from and p_to),
        'admissions', (select count(*) from public.students s where s.institute_id = v_inst and date_trunc('month', s.admission_date) = m and s.admission_date between p_from and p_to),
        'attendance_pct', (select round(100.0 * count(*) filter (where status in ('present', 'late')) / nullif(count(*) filter (where status <> 'excused'), 0), 1)
                             from public.attendance a where a.institute_id = v_inst and date_trunc('month', a.session_date) = m and a.session_date between p_from and p_to)
      ) order by m), '[]'::jsonb) from months
    ),
    'batch_distribution', (
      select coalesce(jsonb_agg(jsonb_build_object('name', b.name, 'students', x.n) order by x.n desc), '[]'::jsonb)
        from public.batches b
        join lateral (select count(*) n from public.student_batches sb where sb.batch_id = b.id and sb.status = 'active') x on true
       where b.institute_id = v_inst and b.status = 'active'
    ),
    'today_classes', (
      select coalesce(jsonb_agg(jsonb_build_object('id', cs.id, 'batch', b.name, 'subject', su.name, 'teacher', t.full_name,
                     'start', cs.start_time, 'end', cs.end_time, 'room', cs.room, 'status', cs.status,
                     'marked', cs.attendance_submitted_at is not null) order by cs.start_time), '[]'::jsonb)
        from public.class_sessions cs
        join public.batches b on b.id = cs.batch_id
        left join public.subjects su on su.id = cs.subject_id
        left join public.teachers t on t.id = cs.teacher_id
       where cs.institute_id = v_inst and cs.session_date = v_today
    ),
    'pending_fee_list', (
      select coalesce(jsonb_agg(x order by x->>'oldest_due'), '[]'::jsonb) from (
        select jsonb_build_object('student_id', s.id, 'name', s.full_name, 'admission_no', s.admission_no,
               'balance', sum(o.net_amount - o.amount_paid), 'oldest_due', min(o.due_date),
               'overdue', bool_or(o.due_date < v_today)) x
          from public.fee_obligations o join public.students s on s.id = o.student_id
         where o.institute_id = v_inst and o.status in ('unpaid', 'partially_paid') and o.due_date <= v_today + 7
         group by s.id order by min(o.due_date) limit 8) q
    ),
    'upcoming_exams', (
      select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'start', e.start_date, 'batch', b.name, 'status', e.status) order by e.start_date), '[]'::jsonb)
        from public.examinations e left join public.batches b on b.id = e.batch_id
       where e.institute_id = v_inst and e.start_date >= v_today and e.status in ('scheduled', 'draft', 'marks_entry')
         and e.start_date <= v_today + 30
    ),
    'recent_admissions', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', s.id, 'name', s.full_name, 'admission_no', s.admission_no, 'date', s.admission_date, 'class', c.name) x
          from public.students s left join public.classes c on c.id = s.class_id
         where s.institute_id = v_inst order by s.created_at desc limit 6) q
    ),
    'recent_payments', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', p.id, 'student', s.full_name, 'amount', p.amount, 'date', p.payment_date,
                                  'method', p.method, 'status', p.status, 'receipt_no', r.receipt_no) x
          from public.payments p join public.students s on s.id = p.student_id left join public.receipts r on r.payment_id = p.id
         where p.institute_id = v_inst order by p.created_at desc limit 6) q
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('action', a.action, 'entity', a.entity, 'at', a.created_at, 'by', pr.full_name) x
          from public.audit_logs a left join public.profiles pr on pr.id = a.user_id
         where a.institute_id = v_inst and a.action <> 'login' order by a.created_at desc limit 8) q
    ),
    'birthdays', (
      select coalesce(jsonb_agg(x order by x->>'in_days'), '[]'::jsonb) from (
        select jsonb_build_object('id', s.id, 'name', s.full_name, 'date', s.date_of_birth,
               'in_days', ((make_date(extract(year from v_today)::int, extract(month from s.date_of_birth)::int,
                            least(extract(day from s.date_of_birth)::int, 28)) - v_today + 365) % 365)) x
          from public.students s
         where s.institute_id = v_inst and s.status = 'active' and s.date_of_birth is not null
           and ((make_date(extract(year from v_today)::int, extract(month from s.date_of_birth)::int,
                 least(extract(day from s.date_of_birth)::int, 28)) - v_today + 365) % 365) <= 7) q
    ),
    'announcements', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select jsonb_build_object('id', an.id, 'title', an.title, 'body', an.body, 'at', an.created_at, 'important', an.is_important) x
          from public.announcements an
         where an.institute_id = v_inst and (an.expires_at is null or an.expires_at > now())
         order by an.is_important desc, an.created_at desc limit 4) q
    )
  ) into r;
  return r;
end $$;
grant execute on function public.admin_dashboard(date, date) to authenticated;

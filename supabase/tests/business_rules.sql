-- Business-rule & RLS tests. Run: npm run db:test   (everything rolls back)
\set ON_ERROR_STOP 1
begin;
create or replace function pg_temp.as_user(p uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.as_postgres() returns void language plpgsql as $$
begin perform set_config('role', 'postgres', true); end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond then raise notice 'PASS  %', label; else raise exception 'FAIL  %', label; end if;
end $$;
create or replace function pg_temp.expect_error(sql text, pattern text, label text) returns void language plpgsql as $$
declare v_raised boolean := false; v_msg text; v_rows integer;
begin
  begin
    execute sql;
    get diagnostics v_rows = row_count;
  exception when others then
    v_raised := true; v_msg := sqlerrm;
  end;
  if v_raised and v_msg ~* pattern then raise notice 'PASS  % -> %', label, v_msg;
  elsif v_raised then raise exception 'FAIL  % (unexpected error: %)', label, v_msg;
  elsif pattern ~ '0 rows' and v_rows = 0 then raise notice 'PASS  % -> blocked by RLS (0 rows affected)', label;
  else raise exception 'FAIL  % (no error raised, % rows)', label, v_rows; end if;
end $$;

-- ---------- Fixtures ----------
insert into institutes (id, name) values ('11111111-1111-1111-1111-111111111111', 'Test Institute');
select seed_institute_defaults('11111111-1111-1111-1111-111111111111');
insert into institutes (id, name) values ('99999999-9999-9999-9999-999999999999', 'Other Institute');
select seed_institute_defaults('99999999-9999-9999-9999-999999999999');

insert into auth.users (id, email, instance_id, aud, role) values
 ('a0000000-0000-0000-0000-000000000001', 'admin@test.in', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
 ('a0000000-0000-0000-0000-000000000002', 'teacher@test.in', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
 ('a0000000-0000-0000-0000-000000000003', 'parent@test.in', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
 ('a0000000-0000-0000-0000-000000000004', 'otherparent@test.in', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
 ('a0000000-0000-0000-0000-000000000005', 'otheradmin@test.in', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
 ('a0000000-0000-0000-0000-000000000006', 'teacher2@test.in', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
update profiles set institute_id = '11111111-1111-1111-1111-111111111111', status = 'active' where id::text like 'a0000000%';
update profiles set institute_id = '99999999-9999-9999-9999-999999999999' where id = 'a0000000-0000-0000-0000-000000000005';
insert into user_roles (user_id, institute_id, role) values
 ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'admin'),
 ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'teacher'),
 ('a0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'teacher'),
 ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'parent'),
 ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'parent'),
 ('a0000000-0000-0000-0000-000000000005', '99999999-9999-9999-9999-999999999999', 'admin');

select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
insert into classes (id, institute_id, name) values ('c0000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Standard 10');
insert into subjects (id, institute_id, class_id, name, code) values ('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000010', 'Mathematics', 'MATH10');
insert into batches (id, institute_id, class_id, name, capacity, start_time, end_time) values
 ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000010', 'Morning', 1, '07:00', '08:00'),
 ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000010', 'Evening', 30, '17:00', '18:00');
insert into teachers (id, institute_id, profile_id, full_name, phone) values
 ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000002', 'Teacher A', '9000000001'),
 ('70000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000006', 'Teacher B', '9000000002');
insert into teacher_batches (institute_id, teacher_id, batch_id) values
 ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
 ('11111111-1111-1111-1111-111111111111', '70000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002');

-- ---------- Admission ----------
create temp table t (k text primary key, v jsonb);
grant all on t to authenticated;
insert into t select 'adm', admit_student(jsonb_build_object(
  'student', jsonb_build_object('full_name', 'Rahul Shah', 'date_of_birth', '2011-05-04', 'class_id', 'c0000000-0000-0000-0000-000000000010', 'admission_date', '2026-01-01'),
  'guardians', jsonb_build_array(jsonb_build_object('full_name', 'Mr Shah', 'phone', '9876543210', 'relationship', 'father', 'is_primary', true)),
  'batch_ids', jsonb_build_array('b0000000-0000-0000-0000-000000000001'),
  'fees', jsonb_build_array(jsonb_build_object('description', 'Course fee', 'fee_type', 'custom', 'base_amount', 5000, 'installments', 1, 'start_date', '2026-01-01', 'due_day', 10),
                            jsonb_build_object('description', 'Tuition', 'fee_type', 'monthly', 'base_amount', 4500, 'installments', 3, 'start_date', '2026-01-01', 'due_day', 5,
                                               'discount_amount', 450, 'discount_reason', 'Sibling discount'))));
select pg_temp.check((select v->>'admission_no' from t where k = 'adm') = 'ADM-2026-0001', 'admission number generated');
select pg_temp.check((select v->>'obligations_created' from t where k = 'adm')::int = 4, '4 obligations created (1 course + 3 monthly)');
select pg_temp.check((select sum(net_amount) from fee_obligations) = 9050, 'obligation totals: 5000 + 4500 - 450 = 9050');
select pg_temp.check((select count(*) from fee_obligations where description like 'Tuition – Feb 2026') = 1, 'monthly obligation labelled by month');
select pg_temp.check((select gross_amount from fee_obligations where description like 'Tuition – Mar%') = 1500, 'per-month gross = 1500');
select pg_temp.check(generate_fee_obligations((select id from student_fee_assignments where description = 'Tuition')) = 0, 'obligation generation is idempotent');

-- Duplicate admission guard
select pg_temp.expect_error($$select admit_student('{"student":{"full_name":"rahul shah","date_of_birth":"2011-05-04"},"guardians":[{"full_name":"X","phone":"9876543210"}]}')$$,
  'same name, date of birth', 'duplicate admission rejected');
-- Capacity (Morning has capacity 1)
select pg_temp.expect_error($$select admit_student('{"student":{"full_name":"Priya"},"guardians":[{"full_name":"Mrs P","phone":"9811111111"}],"batch_ids":["b0000000-0000-0000-0000-000000000001"]}')$$,
  'Batch is full', 'batch capacity enforced');
insert into t select 'adm2', admit_student('{"student":{"full_name":"Priya","admission_date":"2026-01-01"},"guardians":[{"full_name":"Mrs P","phone":"9811111111"}],"batch_ids":["b0000000-0000-0000-0000-000000000001"],"capacity_override_reason":"Principal approved"}');
select pg_temp.check((select count(*) from student_batches where batch_id = 'b0000000-0000-0000-0000-000000000001' and status = 'active') = 2, 'capacity override with reason works');

select pg_temp.as_postgres();
update guardians set profile_id = 'a0000000-0000-0000-0000-000000000003' where phone = '9876543210' and institute_id = '11111111-1111-1111-1111-111111111111';
update guardians set profile_id = 'a0000000-0000-0000-0000-000000000004' where phone = '9811111111' and institute_id = '11111111-1111-1111-1111-111111111111';
select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');

-- ---------- Partial payments (SOP 9.6) ----------
insert into t select 'course_obl', to_jsonb(id) from fee_obligations where description = 'Course fee';
insert into t select 'p1', record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 2000, '2026-01-02', 'cash', null, null,
  array[(select (v #>> '{}')::uuid from t where k = 'course_obl')], 'key-1');
select pg_temp.check((select net_amount - amount_paid from fee_obligations where description = 'Course fee') = 3000, 'after ₹2000: ₹3000 remaining');
select pg_temp.check((select status from fee_obligations where description = 'Course fee') = 'partially_paid', 'status partially_paid');
select record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 1000, '2026-01-03', 'upi', 'UPI123', null,
  array[(select (v #>> '{}')::uuid from t where k = 'course_obl')], 'key-2');
select pg_temp.check((select net_amount - amount_paid from fee_obligations where description = 'Course fee') = 2000, 'after ₹1000: ₹2000 remaining');
select record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 2000, '2026-01-04', 'cash', null, null,
  array[(select (v #>> '{}')::uuid from t where k = 'course_obl')], 'key-3');
select pg_temp.check((select status from fee_obligations where description = 'Course fee') = 'paid', 'after ₹2000: fully paid');

-- Duplicate submission returns the same payment
select pg_temp.check((record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 2000, '2026-01-02', 'cash', null, null, null, 'key-1')->>'duplicate')::boolean,
  'duplicate submission (same idempotency key) is not recorded twice');
select pg_temp.check((select count(*) from payments) = 3, 'exactly 3 payments exist');
select pg_temp.check((select count(distinct receipt_no) from receipts) = 3, 'each payment has a unique receipt');

-- Over-payment and validation
select pg_temp.expect_error($$select record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 99999, '2026-01-05', 'cash', null, null, null, 'key-x')$$,
  'exceeds the outstanding', 'over-payment rejected');
select pg_temp.expect_error($$select record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), -5, '2026-01-05', 'cash', null, null, null, 'key-y')$$,
  'greater than zero', 'negative amount rejected');
select pg_temp.expect_error($$select record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 100, '2026-01-05', 'upi', '', null, null, 'key-z')$$,
  'reference is required', 'UPI requires reference');

-- Payment across multiple obligations, oldest first
select record_payment((select (v->>'student_id')::uuid from t where k = 'adm'), 2000, '2026-01-06', 'cash', null, null, null, 'key-4');
select pg_temp.check((select status from fee_obligations where description = 'Tuition – Jan 2026') = 'paid'
                 and (select amount_paid from fee_obligations where description = 'Tuition – Feb 2026') = 650, 'one payment allocated across Jan (1350) + Feb (650)');

-- Reversal (SOP 9.8)
select reverse_payment((select (v->>'payment_id')::uuid from t where k = 'p1'), 'Entered wrong amount');
select pg_temp.check((select status from payments where id = (select (v->>'payment_id')::uuid from t where k = 'p1')) = 'reversed', 'original payment kept, marked reversed');
select pg_temp.check((select net_amount - amount_paid from fee_obligations where description = 'Course fee') = 2000
                 and (select status from fee_obligations where description = 'Course fee') = 'partially_paid', 'reversal restores balance + status');
select pg_temp.expect_error($$select reverse_payment((select (v->>'payment_id')::uuid from t where k = 'p1'), 'again again')$$, 'already been reversed', 'double reversal rejected');
select pg_temp.expect_error($$delete from payments$$, 'cannot be deleted|permission|0 rows', 'payments cannot be deleted');
select pg_temp.expect_error($$update payments set amount = 1$$, 'cannot be edited|permission|0 rows', 'payments cannot be edited');
select pg_temp.expect_error($$update fee_obligations set amount_paid = 0 where description = 'Course fee'$$, 'managed by the system', 'amount_paid cannot be edited directly');
select pg_temp.check((select count(*) from audit_logs where action in ('payment_recorded', 'payment_reversed')) = 5, 'payments + reversal audited');

-- Waiver
select waive_obligation((select id from fee_obligations where description = 'Tuition – Mar 2026'), 'Scholarship granted');
select pg_temp.check((select status from fee_obligations where description = 'Tuition – Mar 2026') = 'waived', 'waiver works');

-- ---------- Attendance ----------
insert into timetable (id, institute_id, batch_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, effective_from)
values ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 1, '07:00', '08:00', 'R1', '2026-01-01');
select pg_temp.expect_error($$insert into timetable (institute_id, batch_id, teacher_id, day_of_week, start_time, end_time, room) values
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 1, '07:30', '08:30', 'R2')$$,
  'teacher is already scheduled', 'teacher double-booking rejected');
select pg_temp.expect_error($$insert into timetable (institute_id, batch_id, teacher_id, day_of_week, start_time, end_time, room) values
  ('11111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 1, '07:30', '08:30', 'r1')$$,
  'Room r1 is already booked', 'room double-booking rejected');
select pg_temp.check(generate_class_sessions('2026-01-05', '2026-01-18') = 2, '2 Monday sessions generated');
select pg_temp.check(generate_class_sessions('2026-01-05', '2026-01-18') = 0, 'session generation is idempotent');

-- Teacher A marks attendance
select pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
select submit_attendance((select id from class_sessions where session_date = '2026-01-05'),
  jsonb_build_array(jsonb_build_object('student_id', (select (v->>'student_id')::uuid from t where k = 'adm'), 'status', 'present'),
                    jsonb_build_object('student_id', (select (v->>'student_id')::uuid from t where k = 'adm2'), 'status', 'absent')));
select pg_temp.check((select count(*) from attendance) = 2, 'teacher marked attendance');
-- Teacher B is not assigned to Morning batch
select pg_temp.as_user('a0000000-0000-0000-0000-000000000006');
select pg_temp.expect_error($$select submit_attendance((select id from class_sessions where session_date = '2026-01-12'), '[]')$$,
  'not authorized|not found', 'unassigned teacher cannot mark attendance');
select pg_temp.check((select count(*) from students) = 0, 'unassigned teacher sees no students');
select pg_temp.check((select count(*) from fee_obligations) = 0, 'teacher sees no fees');
select pg_temp.check((select count(*) from payments) = 0, 'teacher sees no payments');
select pg_temp.check((select count(*) from class_sessions) = 0 and (select count(*) from timetable) = 0, 'teacher cannot see other batches'' sessions/timetable');
select pg_temp.check((select count(*) from teachers) = 1, 'teacher sees only own teacher record');
-- Teacher A: correction deadline passed (session in Jan) -> blocked
select pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
select pg_temp.expect_error($$select submit_attendance((select id from class_sessions where session_date = '2026-01-05'),
  jsonb_build_array(jsonb_build_object('student_id', (select (v->>'student_id')::uuid from t where k = 'adm'), 'status', 'absent')))$$,
  'correction period', 'teacher cannot edit after correction deadline');
select pg_temp.check((select count(*) from students) = 2, 'assigned teacher sees own batch students');
-- Admin correction requires reason
select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
select pg_temp.expect_error($$select submit_attendance((select id from class_sessions where session_date = '2026-01-05'),
  jsonb_build_array(jsonb_build_object('student_id', (select (v->>'student_id')::uuid from t where k = 'adm'), 'status', 'late')))$$,
  'reason is required', 'admin late correction needs reason');
select submit_attendance((select id from class_sessions where session_date = '2026-01-05'),
  jsonb_build_array(jsonb_build_object('student_id', (select (v->>'student_id')::uuid from t where k = 'adm'), 'status', 'late')), 'Teacher reported mistake');
select pg_temp.check((select count(*) from audit_logs where action = 'attendance_correction') = 1, 'attendance correction audited');
select pg_temp.check((select percentage from attendance_summary((select (v->>'student_id')::uuid from t where k = 'adm'))) = 100, 'late counts as present by default (100%)');

-- ---------- Parent visibility ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000003');
select pg_temp.check((select count(*) from students) = 1 and (select full_name from students) = 'Rahul Shah', 'parent sees only linked child');
select pg_temp.check((select count(*) from fee_obligations) = 4, 'parent sees child fees');
select pg_temp.check((select count(*) from receipts) = 4, 'parent sees child receipts');
select pg_temp.check((select count(*) from notifications where type = 'payment_confirmation') = 4, 'parent got payment notifications');
select pg_temp.check((select count(*) from attendance) = 1, 'parent sees child attendance only');
select pg_temp.check((select count(*) from audit_logs) = 0, 'parent cannot read audit logs');
select pg_temp.expect_error($$select record_payment((select id from students limit 1), 10, '2026-01-05', 'cash', null, null, null, 'hack')$$, 'Only admins', 'parent cannot record payment');
select pg_temp.expect_error($$insert into user_roles (user_id, institute_id, role) values ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'admin')$$,
  'row-level security|permission', 'parent cannot escalate own role');
select pg_temp.expect_error($$update profiles set status = 'active', institute_id = '99999999-9999-9999-9999-999999999999' where id = auth.uid()$$,
  'not allowed', 'user cannot move own institute');
select pg_temp.as_user('a0000000-0000-0000-0000-000000000004');
select pg_temp.check((select count(*) from students) = 1 and (select full_name from students) = 'Priya', 'other parent sees only their child');
select pg_temp.check((select count(*) from notifications where type = 'attendance_absence') = 1, 'absence notification queued for parent');

-- ---------- Cross-institute isolation ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000005');
select pg_temp.check((select count(*) from students) = 0 and (select count(*) from payments) = 0 and (select count(*) from batches) = 0, 'other institute admin sees nothing');
select pg_temp.expect_error($$select reverse_payment((select id from payments limit 1), 'malicious reversal')$$, 'not found', 'other institute cannot reverse payment');

-- ---------- Exams ----------
select pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
insert into examinations (id, institute_id, name, batch_id, exam_type, start_date, end_date, status)
values ('ee000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Unit Test 1', 'b0000000-0000-0000-0000-000000000001', 'unit_test', '2026-02-01', '2026-02-01', 'scheduled');
insert into examination_subjects (id, institute_id, examination_id, subject_id, max_marks, passing_marks)
values ('ef000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'ee000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 50, 18);
select pg_temp.expect_error($$insert into marks (institute_id, examination_subject_id, student_id, obtained_marks) values ('11111111-1111-1111-1111-111111111111', 'ef000000-0000-0000-0000-000000000001', (select (v->>'student_id')::uuid from t where k = 'adm'), 51)$$,
  'cannot exceed', 'marks > max rejected');
insert into marks (institute_id, examination_subject_id, student_id, obtained_marks) values ('11111111-1111-1111-1111-111111111111', 'ef000000-0000-0000-0000-000000000001', (select (v->>'student_id')::uuid from t where k = 'adm'), 46);
select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
select pg_temp.expect_error($$select publish_examination('ee000000-0000-0000-0000-000000000001')$$, 'missing', 'publishing blocked while marks missing');
select pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
insert into marks (institute_id, examination_subject_id, student_id, is_absent) values ('11111111-1111-1111-1111-111111111111', 'ef000000-0000-0000-0000-000000000001', (select (v->>'student_id')::uuid from t where k = 'adm2'), true);
select pg_temp.as_user('a0000000-0000-0000-0000-000000000001');
select pg_temp.check(publish_examination('ee000000-0000-0000-0000-000000000001') = 2, 'results published for 2 students');
select pg_temp.check((select grade from published_results r join students s on s.id = r.student_id where s.full_name = 'Rahul Shah') = 'A+', '46/50 = 92% => A+');
select pg_temp.check((select not is_pass from published_results r join students s on s.id = r.student_id where s.full_name = 'Priya'), 'absent student fails');
select pg_temp.as_user('a0000000-0000-0000-0000-000000000002');
select pg_temp.expect_error($$update marks set obtained_marks = 10$$, 'published', 'teacher cannot edit published marks');

rollback;
\echo ALL TESTS PASSED

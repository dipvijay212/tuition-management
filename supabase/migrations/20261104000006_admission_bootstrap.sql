-- =====================================================================
-- 0006 ADMISSION WORKFLOW, BATCH TRANSFER, STATUS CHANGE, BOOTSTRAP
-- =====================================================================

-- Seed per-institute defaults (categories, grading). Called on bootstrap.
create or replace function public.seed_institute_defaults(p_inst uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.institute_settings (institute_id) values (p_inst) on conflict do nothing;

  insert into public.income_categories (institute_id, name, is_system)
  select p_inst, n, true from unnest(array['Tuition Fees', 'Admission Fees', 'Registration Fees', 'Study Material Charges', 'Other Income']) n
  on conflict do nothing;

  insert into public.expense_categories (institute_id, name, is_system)
  select p_inst, n, true from unnest(array['Teacher Salary', 'Rent', 'Electricity', 'Internet', 'Stationery',
                                           'Maintenance', 'Marketing', 'Equipment', 'Other Expenses']) n
  on conflict do nothing;

  insert into public.grading_rules (institute_id, grade, min_percentage, max_percentage, is_pass, sort_order)
  values (p_inst, 'A+', 90, 100, true, 1), (p_inst, 'A', 80, 89.99, true, 2), (p_inst, 'B+', 70, 79.99, true, 3),
         (p_inst, 'B', 60, 69.99, true, 4), (p_inst, 'C', 50, 59.99, true, 5), (p_inst, 'D', 35, 49.99, true, 6),
         (p_inst, 'F', 0, 34.99, false, 7)
  on conflict do nothing;
end $$;
revoke all on function public.seed_institute_defaults(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- admit_student: one transaction for the whole admission workflow.
-- p: {
--   student: {full_name, date_of_birth, gender, blood_group, address, city, state, pin_code,
--             phone, email, school_name, class_id, academic_year_id, subject_ids[], admission_date,
--             previous_academics, admission_no?},
--   guardians: [{full_name, phone, alt_phone, email, relationship, is_primary, is_emergency_contact}],
--   batch_ids: [uuid], capacity_override_reason?,
--   fees: [{fee_structure_id?, description?, category?, fee_type?, base_amount?, installments?,
--           discount_id?, discount_amount?, scholarship_amount?, discount_reason?, start_date?, due_day?, batch_id?}]
-- }
-- ---------------------------------------------------------------------
create or replace function public.admit_student(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid := public.auth_institute_id();
  v_settings public.institute_settings;
  s jsonb := p -> 'student';
  g jsonb;
  f jsonb;
  b text;
  v_student uuid;
  v_guardian uuid;
  v_adm text;
  v_struct public.fee_structures;
  v_disc public.discounts;
  v_base numeric(12,2);
  v_disc_amt numeric(12,2);
  v_sch numeric(12,2);
  v_assign uuid;
  v_obl integer := 0;
  v_year text;
begin
  if not public.is_admin() then raise exception 'Only admins can admit students'; end if;
  if coalesce(trim(s ->> 'full_name'), '') = '' then raise exception 'Student name is required'; end if;
  if jsonb_array_length(coalesce(p -> 'guardians', '[]')) = 0 then raise exception 'At least one parent/guardian is required'; end if;
  select * into v_settings from public.institute_settings where institute_id = v_inst;

  -- Admission number: supplied (validated unique) or generated.
  v_year := to_char(coalesce((s ->> 'admission_date')::date, current_date), 'YYYY');
  if coalesce(trim(s ->> 'admission_no'), '') <> '' then
    v_adm := upper(trim(s ->> 'admission_no'));
    if exists (select 1 from public.students where institute_id = v_inst and admission_no = v_adm) then
      raise exception 'Admission number % is already in use', v_adm;
    end if;
  else
    v_adm := v_settings.admission_prefix || '-' || v_year || '-'
             || lpad(public.next_sequence_value(v_inst, 'admission_' || v_year)::text, 4, '0');
  end if;

  -- Duplicate admission guard: same name + DOB + guardian phone.
  if exists (
    select 1 from public.students st
      join public.parent_students ps on ps.student_id = st.id
      join public.guardians gg on gg.id = ps.guardian_id
     where st.institute_id = v_inst
       and lower(st.full_name) = lower(trim(s ->> 'full_name'))
       and st.date_of_birth is not distinct from nullif(s ->> 'date_of_birth', '')::date
       and gg.phone = any(select x ->> 'phone' from jsonb_array_elements(p -> 'guardians') x)
       and st.status in ('active', 'on_hold')
  ) then
    raise exception 'A student with the same name, date of birth and parent phone already exists';
  end if;

  insert into public.students (institute_id, admission_no, full_name, date_of_birth, gender, blood_group, address, city,
                               state, pin_code, phone, email, school_name, class_id, academic_year_id, subject_ids,
                               admission_date, previous_academics, created_by)
  values (v_inst, v_adm, trim(s ->> 'full_name'), nullif(s ->> 'date_of_birth', '')::date,
          nullif(s ->> 'gender', '')::public.gender, nullif(s ->> 'blood_group', ''), nullif(s ->> 'address', ''),
          nullif(s ->> 'city', ''), nullif(s ->> 'state', ''), nullif(s ->> 'pin_code', ''), nullif(s ->> 'phone', ''),
          nullif(lower(s ->> 'email'), ''), nullif(s ->> 'school_name', ''), nullif(s ->> 'class_id', '')::uuid,
          coalesce(nullif(s ->> 'academic_year_id', '')::uuid, v_settings.current_academic_year_id),
          coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(s -> 'subject_ids') x), '{}'),
          coalesce(nullif(s ->> 'admission_date', '')::date, current_date), nullif(s ->> 'previous_academics', ''), auth.uid())
  returning id into v_student;

  -- Guardians: reuse by phone (siblings share one parent record/account).
  for g in select * from jsonb_array_elements(p -> 'guardians') loop
    if coalesce(trim(g ->> 'full_name'), '') = '' or coalesce(trim(g ->> 'phone'), '') = '' then
      raise exception 'Parent name and mobile number are required';
    end if;
    insert into public.guardians (institute_id, full_name, phone, alt_phone, email)
    values (v_inst, trim(g ->> 'full_name'), trim(g ->> 'phone'), nullif(g ->> 'alt_phone', ''), nullif(lower(g ->> 'email'), ''))
    on conflict (institute_id, phone) do update
      set alt_phone = coalesce(excluded.alt_phone, guardians.alt_phone),
          email = coalesce(excluded.email, guardians.email)
    returning id into v_guardian;

    insert into public.parent_students (institute_id, guardian_id, student_id, relationship, is_primary, is_emergency_contact)
    values (v_inst, v_guardian, v_student, coalesce(nullif(g ->> 'relationship', ''), 'parent'),
            coalesce((g ->> 'is_primary')::boolean, false), coalesce((g ->> 'is_emergency_contact')::boolean, false))
    on conflict do nothing;
  end loop;

  -- Batches (capacity trigger enforces limits / override reason).
  for b in select * from jsonb_array_elements_text(coalesce(p -> 'batch_ids', '[]')) loop
    insert into public.student_batches (institute_id, student_id, batch_id, start_date, capacity_override_reason, created_by)
    values (v_inst, v_student, b::uuid, coalesce(nullif(s ->> 'admission_date', '')::date, current_date),
            nullif(p ->> 'capacity_override_reason', ''), auth.uid());
  end loop;

  -- Fees.
  for f in select * from jsonb_array_elements(coalesce(p -> 'fees', '[]')) loop
    v_struct := null; v_disc := null;
    if nullif(f ->> 'fee_structure_id', '') is not null then
      select * into v_struct from public.fee_structures
       where id = (f ->> 'fee_structure_id')::uuid and institute_id = v_inst and status = 'active';
      if not found then raise exception 'Selected fee structure is not available'; end if;
    end if;

    v_base := coalesce(nullif(f ->> 'base_amount', '')::numeric, v_struct.total_amount);
    if v_base is null or v_base <= 0 then raise exception 'Fee amount must be greater than zero'; end if;

    v_disc_amt := coalesce(nullif(f ->> 'discount_amount', '')::numeric, 0);
    if nullif(f ->> 'discount_id', '') is not null then
      select * into v_disc from public.discounts where id = (f ->> 'discount_id')::uuid and institute_id = v_inst and status = 'active';
      if not found then raise exception 'Selected discount is not available'; end if;
      if v_struct.id is not null and not v_struct.discount_eligible then
        raise exception 'Fee structure % is not eligible for discounts', v_struct.name;
      end if;
      v_disc_amt := case when v_disc.discount_type = 'percent' then round(v_base * v_disc.value / 100, 2) else v_disc.value end;
    end if;
    v_sch := coalesce(nullif(f ->> 'scholarship_amount', '')::numeric, 0);
    if v_disc_amt + v_sch > v_base then raise exception 'Discount and scholarship cannot exceed the fee amount'; end if;

    insert into public.student_fee_assignments (institute_id, student_id, fee_structure_id, batch_id, description, category,
       fee_type, base_amount, discount_id, discount_amount, scholarship_amount, discount_reason, discount_approved_by,
       installments, start_date, due_day, late_fee_applicable, created_by)
    values (v_inst, v_student, v_struct.id, nullif(f ->> 'batch_id', '')::uuid,
       coalesce(nullif(f ->> 'description', ''), v_struct.name, 'Tuition fee'),
       coalesce(nullif(f ->> 'category', '')::public.fee_category, v_struct.category, 'tuition'),
       coalesce(nullif(f ->> 'fee_type', '')::public.fee_type, v_struct.fee_type, 'course'),
       v_base, v_disc.id, v_disc_amt, v_sch,
       case when v_disc_amt + v_sch > 0 then coalesce(nullif(f ->> 'discount_reason', ''), v_disc.name) end,
       case when v_disc_amt + v_sch > 0 then auth.uid() end,
       coalesce(nullif(f ->> 'installments', '')::int, v_struct.installments, 1),
       coalesce(nullif(f ->> 'start_date', '')::date, nullif(s ->> 'admission_date', '')::date, current_date),
       coalesce(nullif(f ->> 'due_day', '')::smallint, v_struct.default_due_day, v_settings.default_due_day),
       coalesce(v_struct.late_fee_applicable, true), auth.uid())
    returning id into v_assign;

    v_obl := v_obl + public.generate_fee_obligations(v_assign);
  end loop;

  perform public.write_audit('student_admitted', 'students', v_student::text, null,
    jsonb_build_object('admission_no', v_adm, 'batches', p -> 'batch_ids', 'fees', p -> 'fees'), null);

  return jsonb_build_object('student_id', v_student, 'admission_no', v_adm, 'obligations_created', v_obl);
end $$;

-- Add a fee arrangement to an existing student (same rules as admission).
create or replace function public.assign_student_fee(p_student uuid, f jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid := public.auth_institute_id();
  v_st public.students;
  v_struct public.fee_structures;
  v_disc public.discounts;
  v_base numeric(12,2); v_disc_amt numeric(12,2); v_sch numeric(12,2);
  v_assign uuid; v_due smallint;
begin
  if not public.is_admin() then raise exception 'Only admins can assign fees'; end if;
  select * into v_st from public.students where id = p_student and institute_id = v_inst;
  if not found then raise exception 'Student not found'; end if;
  if v_st.status <> 'active' and not coalesce((f ->> 'force_inactive')::boolean, false) then
    raise exception 'Fees cannot be assigned to an inactive student without explicit authorization';
  end if;
  if nullif(f ->> 'fee_structure_id', '') is not null then
    select * into v_struct from public.fee_structures where id = (f ->> 'fee_structure_id')::uuid and institute_id = v_inst and status = 'active';
    if not found then raise exception 'Selected fee structure is not available'; end if;
  end if;
  v_base := coalesce(nullif(f ->> 'base_amount', '')::numeric, v_struct.total_amount);
  if v_base is null or v_base <= 0 then raise exception 'Fee amount must be greater than zero'; end if;
  v_disc_amt := coalesce(nullif(f ->> 'discount_amount', '')::numeric, 0);
  if nullif(f ->> 'discount_id', '') is not null then
    select * into v_disc from public.discounts where id = (f ->> 'discount_id')::uuid and institute_id = v_inst and status = 'active';
    if not found then raise exception 'Selected discount is not available'; end if;
    v_disc_amt := case when v_disc.discount_type = 'percent' then round(v_base * v_disc.value / 100, 2) else v_disc.value end;
  end if;
  v_sch := coalesce(nullif(f ->> 'scholarship_amount', '')::numeric, 0);
  if v_disc_amt + v_sch > v_base then raise exception 'Discount and scholarship cannot exceed the fee amount'; end if;
  select default_due_day into v_due from public.institute_settings where institute_id = v_inst;

  insert into public.student_fee_assignments (institute_id, student_id, fee_structure_id, batch_id, description, category,
     fee_type, base_amount, discount_id, discount_amount, scholarship_amount, discount_reason, discount_approved_by,
     installments, start_date, due_day, late_fee_applicable, created_by)
  values (v_inst, p_student, v_struct.id, nullif(f ->> 'batch_id', '')::uuid,
     coalesce(nullif(f ->> 'description', ''), v_struct.name, 'Fee'),
     coalesce(nullif(f ->> 'category', '')::public.fee_category, v_struct.category, 'tuition'),
     coalesce(nullif(f ->> 'fee_type', '')::public.fee_type, v_struct.fee_type, 'course'),
     v_base, v_disc.id, v_disc_amt, v_sch,
     case when v_disc_amt + v_sch > 0 then coalesce(nullif(f ->> 'discount_reason', ''), v_disc.name) end,
     case when v_disc_amt + v_sch > 0 then auth.uid() end,
     coalesce(nullif(f ->> 'installments', '')::int, v_struct.installments, 1),
     coalesce(nullif(f ->> 'start_date', '')::date, current_date),
     coalesce(nullif(f ->> 'due_day', '')::smallint, v_struct.default_due_day, v_due),
     coalesce(v_struct.late_fee_applicable, true), auth.uid())
  returning id into v_assign;

  return jsonb_build_object('assignment_id', v_assign, 'obligations_created', public.generate_fee_obligations(v_assign));
end $$;

-- Transfer between batches: preserves history.
create or replace function public.transfer_student_batch(p_enrolment uuid, p_to_batch uuid, p_date date, p_reason text, p_capacity_override text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e public.student_batches; v_new uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can transfer students'; end if;
  if coalesce(length(trim(p_reason)), 0) < 3 then raise exception 'A transfer reason is required'; end if;
  select * into e from public.student_batches where id = p_enrolment and institute_id = public.auth_institute_id() for update;
  if not found or e.status <> 'active' then raise exception 'Active enrolment not found'; end if;
  if e.batch_id = p_to_batch then raise exception 'Student is already in this batch'; end if;
  if p_date < e.start_date then raise exception 'Transfer date cannot be before the enrolment start date'; end if;

  insert into public.student_batches (institute_id, student_id, batch_id, start_date, capacity_override_reason, created_by)
  values (e.institute_id, e.student_id, p_to_batch, p_date, p_capacity_override, auth.uid())
  returning id into v_new;

  update public.student_batches
     set status = 'transferred', end_date = greatest(p_date - 1, e.start_date), end_reason = trim(p_reason), transferred_to = v_new
   where id = e.id;
  return v_new;
end $$;

-- Status change with reason (history kept by trigger).
create or replace function public.change_student_status(p_student uuid, p_status public.student_status, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_old public.student_status;
begin
  if not public.is_admin() then raise exception 'Only admins can change student status'; end if;
  select status into v_old from public.students where id = p_student and institute_id = public.auth_institute_id() for update;
  if not found then raise exception 'Student not found'; end if;
  if v_old = p_status then return; end if;
  if p_status <> 'active' and coalesce(length(trim(p_reason)), 0) < 3 then raise exception 'A reason is required'; end if;
  perform set_config('app.status_reason', coalesce(p_reason, ''), true);
  update public.students set status = p_status where id = p_student;
  -- Leaving: close active batch enrolments (history preserved).
  if p_status in ('discontinued', 'completed') then
    update public.student_batches set status = 'ended', end_date = current_date, end_reason = 'Student ' || p_status::text || ': ' || p_reason
     where student_id = p_student and status = 'active';
  end if;
end $$;

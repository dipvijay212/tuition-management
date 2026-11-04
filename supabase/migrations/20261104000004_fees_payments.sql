-- =====================================================================
-- 0004 FEES, OBLIGATIONS, PAYMENTS, ALLOCATIONS, REVERSALS, RECEIPTS
-- Money is numeric(12,2). All multi-step operations are single-transaction
-- SECURITY DEFINER functions; clients never write payments directly.
-- =====================================================================

create type public.fee_type as enum ('monthly', 'quarterly', 'half_yearly', 'yearly', 'course', 'custom');
create type public.fee_category as enum ('tuition', 'admission', 'registration', 'study_material', 'other');
create type public.obligation_status as enum ('unpaid', 'partially_paid', 'paid', 'waived', 'cancelled');
create type public.payment_method as enum ('cash', 'upi', 'bank_transfer', 'cheque', 'online', 'other');
create type public.payment_status as enum ('completed', 'reversed');

create table public.fee_structures (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  class_id uuid references public.classes(id),
  name text not null,
  fee_type public.fee_type not null,
  category public.fee_category not null default 'tuition',
  total_amount numeric(12,2) not null check (total_amount > 0),
  installments integer not null default 1 check (installments between 1 and 60),
  default_due_day smallint check (default_due_day between 1 and 28),
  discount_eligible boolean not null default true,
  late_fee_applicable boolean not null default true,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institute_id, name)
);
create trigger trg_fee_structures_updated before update on public.fee_structures for each row execute function public.set_updated_at();
create trigger trg_audit_fee_structures after insert or update on public.fee_structures for each row execute function public.audit_row_change();

-- Months between installments for each fee type (course = one-time).
create or replace function public.fee_type_interval_months(p public.fee_type)
returns integer language sql immutable as $$
  select case p when 'monthly' then 1 when 'quarterly' then 3 when 'half_yearly' then 6
                when 'yearly' then 12 when 'custom' then 1 else 0 end
$$;

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  name text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  value numeric(12,2) not null check (value > 0),
  is_scholarship boolean not null default false,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (institute_id, name),
  check (discount_type <> 'percent' or value <= 100)
);

create table public.student_fee_assignments (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id),
  fee_structure_id uuid references public.fee_structures(id),
  batch_id uuid references public.batches(id),
  description text not null,
  category public.fee_category not null default 'tuition',
  fee_type public.fee_type not null,
  base_amount numeric(12,2) not null check (base_amount > 0),          -- original fee, preserved
  discount_id uuid references public.discounts(id),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  scholarship_amount numeric(12,2) not null default 0 check (scholarship_amount >= 0),
  net_amount numeric(12,2) generated always as (base_amount - discount_amount - scholarship_amount) stored,
  discount_reason text,
  discount_approved_by uuid references public.profiles(id),
  installments integer not null default 1 check (installments between 1 and 60),
  start_date date not null,
  due_day smallint not null check (due_day between 1 and 28),
  late_fee_applicable boolean not null default true,
  status text not null default 'active' check (status in ('active', 'cancelled', 'completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (discount_amount + scholarship_amount <= base_amount),
  check ((discount_amount + scholarship_amount = 0) or coalesce(trim(discount_reason), '') <> '')
);
create index sfa_student_idx on public.student_fee_assignments (student_id);
create trigger trg_audit_sfa after insert or update on public.student_fee_assignments for each row execute function public.audit_row_change();

create table public.fee_obligations (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id),
  assignment_id uuid references public.student_fee_assignments(id),
  installment_no integer,
  category public.fee_category not null default 'tuition',
  description text not null,
  period_start date,
  period_end date,
  due_date date not null,
  gross_amount numeric(12,2) not null check (gross_amount > 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  late_fee_amount numeric(12,2) not null default 0 check (late_fee_amount >= 0),
  net_amount numeric(12,2) generated always as (gross_amount - discount_amount + late_fee_amount) stored,
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  status public.obligation_status not null default 'unpaid',
  late_fee_applied_at timestamptz,
  waived_reason text,
  waived_by uuid references public.profiles(id),
  waived_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_amount <= gross_amount),
  check (amount_paid <= gross_amount - discount_amount + late_fee_amount)
);
-- Idempotent generation from an assignment.
create unique index fee_obligations_installment_unique on public.fee_obligations (assignment_id, installment_no) where assignment_id is not null;
create index fee_obligations_student_idx on public.fee_obligations (student_id, due_date);
create index fee_obligations_inst_status_idx on public.fee_obligations (institute_id, status, due_date);
create trigger trg_fee_obligations_updated before update on public.fee_obligations for each row execute function public.set_updated_at();
create trigger trg_audit_fee_obligations after update on public.fee_obligations for each row execute function public.audit_row_change();

-- amount_paid/status may only be changed by the internal payment functions.
-- Those run as the function owner (SECURITY DEFINER); API users run as
-- 'authenticated', so this check cannot be bypassed or leak across statements.
create or replace function public.is_api_user()
returns boolean language sql stable as $$
  select current_user in ('authenticated', 'anon')
$$;

create or replace function public.guard_obligation_money()
returns trigger language plpgsql security invoker as $$
begin
  if public.is_api_user() then
    if tg_op = 'INSERT' and (new.amount_paid <> 0 or new.status not in ('unpaid')) then
      raise exception 'New obligations must start unpaid';
    end if;
    if tg_op = 'UPDATE' and (new.amount_paid <> old.amount_paid or new.status <> old.status
        or new.late_fee_amount <> old.late_fee_amount) then
      raise exception 'Payment amounts and status are managed by the system';
    end if;
    if tg_op = 'UPDATE' and old.amount_paid > 0 and
       (new.gross_amount <> old.gross_amount or new.discount_amount <> old.discount_amount) then
      raise exception 'Cannot change the amount of an obligation that has payments';
    end if;
  end if;
  return new;
end $$;
create trigger trg_fee_obligations_guard before insert or update on public.fee_obligations
  for each row execute function public.guard_obligation_money();

-- Derived status (used internally after any money change).
create or replace function public.obligation_base_status(p_net numeric, p_paid numeric, p_current public.obligation_status)
returns public.obligation_status language sql immutable as $$
  select case
    when p_current in ('waived', 'cancelled') then p_current
    when p_paid >= p_net then 'paid'::public.obligation_status
    when p_paid > 0 then 'partially_paid'::public.obligation_status
    else 'unpaid'::public.obligation_status end
$$;

-- Balance view with effective (time-aware) status incl. OVERDUE.
create or replace view public.fee_obligation_balances with (security_invoker = true) as
select o.*,
       (o.net_amount - o.amount_paid) as balance,
       case
         when o.status in ('unpaid', 'partially_paid')
              and o.due_date < (now() at time zone coalesce(s.timezone, 'Asia/Kolkata'))::date
           then 'overdue'
         else o.status::text
       end as effective_status
  from public.fee_obligations o
  left join public.institute_settings s on s.institute_id = o.institute_id;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id),
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null,
  method public.payment_method not null,
  reference text,
  remarks text,
  received_by uuid references public.profiles(id),
  status public.payment_status not null default 'completed',
  idempotency_key text not null,
  corrects_payment_id uuid references public.payments(id),
  created_at timestamptz not null default now(),
  unique (institute_id, idempotency_key)
);
create index payments_student_idx on public.payments (student_id, payment_date desc);
create index payments_inst_date_idx on public.payments (institute_id, payment_date);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  payment_id uuid not null references public.payments(id),
  obligation_id uuid not null references public.fee_obligations(id),
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, obligation_id)
);
create index payment_allocations_obligation_idx on public.payment_allocations (obligation_id);

create table public.payment_reversals (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id),
  amount numeric(12,2) not null,
  reason text not null check (length(trim(reason)) >= 5),
  reversed_by uuid not null references public.profiles(id),
  reversed_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id),
  receipt_no text not null,
  issued_at timestamptz not null default now(),
  snapshot jsonb not null,   -- immutable copy of what was printed
  unique (institute_id, receipt_no)
);

-- Financial rows are append-only (no UPDATE except payment status by functions; no DELETE ever).
create or replace function public.forbid_financial_mutation()
returns trigger language plpgsql security invoker as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Financial records cannot be deleted. Use a reversal.';
  end if;
  if public.is_api_user() then
    raise exception 'Financial records cannot be edited. Use a reversal.';
  end if;
  return new;
end $$;
create trigger trg_payments_immutable before update or delete on public.payments for each row execute function public.forbid_financial_mutation();
create trigger trg_allocations_immutable before update or delete on public.payment_allocations for each row execute function public.forbid_financial_mutation();
create trigger trg_reversals_immutable before update or delete on public.payment_reversals for each row execute function public.forbid_financial_mutation();
create trigger trg_receipts_immutable before update or delete on public.receipts for each row execute function public.forbid_financial_mutation();

-- ---------------------------------------------------------------------
-- Generate obligations for an assignment (idempotent).
-- ---------------------------------------------------------------------
create or replace function public.generate_fee_obligations(p_assignment uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  a public.student_fee_assignments;
  v_interval integer;
  v_per_gross numeric(12,2);
  v_per_disc numeric(12,2);
  v_gross numeric(12,2);
  v_disc numeric(12,2);
  v_period date;
  v_due date;
  v_count integer := 0;
  i integer;
begin
  select * into a from public.student_fee_assignments where id = p_assignment;
  if not found then raise exception 'Fee assignment not found'; end if;
  if auth.uid() is not null and not (public.is_admin() and a.institute_id = public.auth_institute_id()) then
    raise exception 'Not authorized';
  end if;
  if a.status <> 'active' then return 0; end if;

  v_interval := public.fee_type_interval_months(a.fee_type);
  v_per_gross := trunc(a.base_amount / a.installments, 2);
  v_per_disc := trunc((a.discount_amount + a.scholarship_amount) / a.installments, 2);

  for i in 1..a.installments loop
    -- Last installment absorbs rounding so totals match exactly.
    v_gross := case when i = a.installments then a.base_amount - v_per_gross * (a.installments - 1) else v_per_gross end;
    v_disc := case when i = a.installments then (a.discount_amount + a.scholarship_amount) - v_per_disc * (a.installments - 1) else v_per_disc end;
    v_period := (date_trunc('month', a.start_date) + make_interval(months => v_interval * (i - 1)))::date;
    v_due := v_period + (a.due_day - 1);
    if v_due < a.start_date and i = 1 then v_due := a.start_date; end if;

    insert into public.fee_obligations (institute_id, student_id, assignment_id, installment_no, category, description,
                                        period_start, period_end, due_date, gross_amount, discount_amount, created_by)
    values (a.institute_id, a.student_id, a.id, i, a.category,
            a.description || case when a.installments > 1
              then ' – ' || case when v_interval = 1 then to_char(v_period, 'Mon YYYY') else 'Installment ' || i || '/' || a.installments end
              else '' end,
            v_period,
            case when v_interval > 0 then (v_period + make_interval(months => v_interval) - interval '1 day')::date end,
            v_due, v_gross, v_disc, auth.uid())
    on conflict (assignment_id, installment_no) where assignment_id is not null do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Record a payment: validate, allocate oldest-due-first across the chosen
-- obligations, update balances, issue receipt, audit, notify.
-- ---------------------------------------------------------------------
create or replace function public.record_payment(
  p_student uuid,
  p_amount numeric,
  p_payment_date date,
  p_method public.payment_method,
  p_reference text,
  p_remarks text,
  p_obligation_ids uuid[],
  p_idempotency_key text,
  p_corrects_payment uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid := public.auth_institute_id();
  v_student public.students;
  v_payment_id uuid;
  v_existing uuid;
  v_remaining numeric(12,2);
  v_outstanding numeric(12,2);
  v_alloc numeric(12,2);
  v_receipt_no text;
  v_prefix text;
  v_items jsonb := '[]'::jsonb;
  v_balance_after numeric(12,2);
  v_institute public.institutes;
  o record;
begin
  if not public.is_admin() then raise exception 'Only admins can record payments'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if round(p_amount, 2) <> p_amount then raise exception 'Amount can have at most 2 decimal places'; end if;
  if p_payment_date is null or p_payment_date > (now() at time zone 'Asia/Kolkata')::date + 1 then
    raise exception 'Payment date cannot be in the future';
  end if;
  if coalesce(trim(p_idempotency_key), '') = '' then raise exception 'Missing idempotency key'; end if;
  if p_method in ('upi', 'bank_transfer', 'cheque', 'online') and coalesce(trim(p_reference), '') = '' then
    raise exception 'Transaction reference is required for % payments', replace(p_method::text, '_', ' ');
  end if;

  -- Duplicate submission (double click / retry) returns the original payment.
  select id into v_existing from public.payments where institute_id = v_inst and idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return jsonb_build_object('payment_id', v_existing,
      'receipt_no', (select receipt_no from public.receipts where payment_id = v_existing), 'duplicate', true);
  end if;

  select * into v_student from public.students where id = p_student and institute_id = v_inst;
  if not found then raise exception 'Student not found'; end if;


  -- Lock the target obligations to make concurrent payments safe.
  select coalesce(sum(net_amount - amount_paid), 0) into v_outstanding
    from (select * from public.fee_obligations
           where student_id = p_student and institute_id = v_inst
             and status in ('unpaid', 'partially_paid')
             and (p_obligation_ids is null or cardinality(p_obligation_ids) = 0 or id = any(p_obligation_ids))
           for update) x;

  if v_outstanding = 0 then raise exception 'There is no outstanding balance on the selected fees'; end if;
  if p_amount > v_outstanding then
    raise exception 'Amount (₹%) exceeds the outstanding balance (₹%) of the selected fees', p_amount, v_outstanding;
  end if;

  insert into public.payments (institute_id, student_id, amount, payment_date, method, reference, remarks,
                               received_by, idempotency_key, corrects_payment_id)
  values (v_inst, p_student, p_amount, p_payment_date, p_method, nullif(trim(p_reference), ''), nullif(trim(p_remarks), ''),
          auth.uid(), p_idempotency_key, p_corrects_payment)
  returning id into v_payment_id;

  v_remaining := p_amount;
  for o in
    select * from public.fee_obligations
     where student_id = p_student and institute_id = v_inst
       and status in ('unpaid', 'partially_paid')
       and (p_obligation_ids is null or cardinality(p_obligation_ids) = 0 or id = any(p_obligation_ids))
     order by due_date, installment_no nulls last, created_at
  loop
    exit when v_remaining <= 0;
    v_alloc := least(v_remaining, o.net_amount - o.amount_paid);
    continue when v_alloc <= 0;

    insert into public.payment_allocations (institute_id, payment_id, obligation_id, amount)
    values (v_inst, v_payment_id, o.id, v_alloc);

    update public.fee_obligations
       set amount_paid = amount_paid + v_alloc,
           status = public.obligation_base_status(net_amount, amount_paid + v_alloc, status)
     where id = o.id;

    v_items := v_items || jsonb_build_object('description', o.description, 'due_date', o.due_date,
      'amount', v_alloc, 'balance', o.net_amount - o.amount_paid - v_alloc);
    v_remaining := v_remaining - v_alloc;
  end loop;

  select coalesce(sum(net_amount - amount_paid), 0) into v_balance_after
    from public.fee_obligations where student_id = p_student and status in ('unpaid', 'partially_paid');

  select receipt_prefix into v_prefix from public.institute_settings where institute_id = v_inst;
  v_receipt_no := coalesce(v_prefix, 'RCPT') || '-' || to_char(p_payment_date, 'YYYY') || '-'
                  || lpad(public.next_sequence_value(v_inst, 'receipt_' || to_char(p_payment_date, 'YYYY'))::text, 5, '0');
  select * into v_institute from public.institutes where id = v_inst;

  insert into public.receipts (institute_id, payment_id, receipt_no, snapshot)
  values (v_inst, v_payment_id, v_receipt_no, jsonb_build_object(
    'institute', jsonb_build_object('name', v_institute.name, 'address', v_institute.address,
                                    'phone', v_institute.phone, 'email', v_institute.email, 'logo_path', v_institute.logo_path),
    'student', jsonb_build_object('name', v_student.full_name, 'admission_no', v_student.admission_no),
    'payment_date', p_payment_date, 'amount', p_amount, 'method', p_method, 'reference', p_reference,
    'items', v_items, 'remaining_balance', v_balance_after,
    'received_by', (select full_name from public.profiles where id = auth.uid())));

  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, new_values)
  values (v_inst, auth.uid(), 'payment_recorded', 'payments', v_payment_id::text,
          jsonb_build_object('student_id', p_student, 'amount', p_amount, 'method', p_method,
                             'receipt_no', v_receipt_no, 'allocations', v_items));

  perform public.notify_student_and_parents(p_student, 'payment_confirmation',
    'Payment received',
    'Payment of ₹' || to_char(p_amount, 'FM99,99,99,990.00') || ' received. Receipt ' || v_receipt_no || '.',
    '/receipts/' || v_payment_id, 'payment:' || v_payment_id);

  return jsonb_build_object('payment_id', v_payment_id, 'receipt_no', v_receipt_no, 'duplicate', false);
end $$;

-- ---------------------------------------------------------------------
-- Reverse a payment (original kept; balances restored; logged).
-- ---------------------------------------------------------------------
create or replace function public.reverse_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_inst uuid := public.auth_institute_id();
  p public.payments;
  al record;
begin
  if not public.is_admin() then raise exception 'Only admins can reverse payments'; end if;
  if coalesce(length(trim(p_reason)), 0) < 5 then raise exception 'Please give a clear reason (at least 5 characters)'; end if;

  select * into p from public.payments where id = p_payment and institute_id = v_inst for update;
  if not found then raise exception 'Payment not found'; end if;
  if p.status = 'reversed' then raise exception 'This payment has already been reversed'; end if;


  for al in select * from public.payment_allocations where payment_id = p.id loop
    update public.fee_obligations
       set amount_paid = amount_paid - al.amount,
           status = public.obligation_base_status(net_amount, amount_paid - al.amount, status)
     where id = al.obligation_id;
  end loop;

  update public.payments set status = 'reversed' where id = p.id;
  insert into public.payment_reversals (institute_id, payment_id, amount, reason, reversed_by)
  values (v_inst, p.id, p.amount, trim(p_reason), auth.uid());

  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, old_values, new_values, reason)
  values (v_inst, auth.uid(), 'payment_reversed', 'payments', p.id::text,
          jsonb_build_object('status', 'completed', 'amount', p.amount), jsonb_build_object('status', 'reversed'), trim(p_reason));
end $$;

-- ---------------------------------------------------------------------
-- Waive an obligation (or the unpaid remainder of it).
-- ---------------------------------------------------------------------
create or replace function public.waive_obligation(p_obligation uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.fee_obligations;
begin
  if not public.is_admin() then raise exception 'Only admins can waive fees'; end if;
  if coalesce(length(trim(p_reason)), 0) < 5 then raise exception 'Please give a clear reason (at least 5 characters)'; end if;
  select * into o from public.fee_obligations where id = p_obligation and institute_id = public.auth_institute_id() for update;
  if not found then raise exception 'Fee not found'; end if;
  if o.status not in ('unpaid', 'partially_paid') then raise exception 'Only unpaid fees can be waived'; end if;

  update public.fee_obligations
     set status = 'waived', waived_reason = trim(p_reason), waived_by = auth.uid(), waived_at = now()
   where id = o.id;
  insert into public.audit_logs (institute_id, user_id, action, entity, entity_id, old_values, new_values, reason)
  values (o.institute_id, auth.uid(), 'fee_waived', 'fee_obligations', o.id::text,
          jsonb_build_object('status', o.status, 'balance', o.net_amount - o.amount_paid),
          jsonb_build_object('status', 'waived'), trim(p_reason));
end $$;

-- ---------------------------------------------------------------------
-- Late fees (idempotent; run daily by scheduler).
-- ---------------------------------------------------------------------
create or replace function public.apply_late_fees(p_institute uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.fee_obligations o
     set late_fee_amount = case when s.late_fee_type = 'fixed' then s.late_fee_value
                                else round((o.gross_amount - o.discount_amount) * s.late_fee_value / 100, 2) end,
         late_fee_applied_at = now()
    from public.institute_settings s
   where s.institute_id = o.institute_id
     and (o.assignment_id is null or exists (
           select 1 from public.student_fee_assignments a
            where a.id = o.assignment_id and a.late_fee_applicable))
     and s.late_fee_enabled and s.late_fee_value > 0
     and o.status in ('unpaid', 'partially_paid')
     and o.late_fee_applied_at is null
     and o.due_date + s.late_fee_grace_days < (now() at time zone s.timezone)::date
     and (p_institute is null or o.institute_id = p_institute)
     and (auth.uid() is null or o.institute_id = public.auth_institute_id());
  get diagnostics v_count = row_count;
  return v_count;
end $$;


export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "academic_years": {
                  Row: {
                    "created_at": string,"end_date": string,"id": string,"institute_id": string,"is_current": boolean,"name": string,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date": string,"id"?: string,"institute_id": string,"is_current"?: boolean,"name": string,"start_date": string
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string,"id"?: string,"institute_id"?: string,"is_current"?: boolean,"name"?: string,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "academic_years_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"announcements": {
                  Row: {
                    "audience": string,"batch_id": string | null,"body": string,"created_at": string,"created_by": string | null,"expires_at": string | null,"id": string,"institute_id": string,"is_important": boolean,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience": string,"batch_id"?: string | null,"body": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"institute_id": string,"is_important"?: boolean,"title": string
                  }
                  Update: {
                    "audience"?: string,"batch_id"?: string | null,"body"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string | null,"id"?: string,"institute_id"?: string,"is_important"?: boolean,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "announcements_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance": {
                  Row: {
                    "batch_id": string,"id": string,"institute_id": string,"marked_at": string,"marked_by": string | null,"remarks": string | null,"session_date": string,"session_id": string,"status": Database["public"]['Enums']["attendance_status"],"student_id": string,"updated_at": string | null,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"id"?: string,"institute_id": string,"marked_at"?: string,"marked_by"?: string | null,"remarks"?: string | null,"session_date": string,"session_id": string,"status": Database["public"]['Enums']["attendance_status"],"student_id": string,"updated_at"?: string | null,"updated_by"?: string | null
                  }
                  Update: {
                    "batch_id"?: string,"id"?: string,"institute_id"?: string,"marked_at"?: string,"marked_by"?: string | null,"remarks"?: string | null,"session_date"?: string,"session_id"?: string,"status"?: Database["public"]['Enums']["attendance_status"],"student_id"?: string,"updated_at"?: string | null,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_marked_by_fkey"
      columns: ["marked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"created_at": string,"entity": string,"entity_id": string | null,"id": number,"institute_id": string | null,"new_values": Json | null,"old_values": Json | null,"reason": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"entity": string,"entity_id"?: string | null,"id"?: never,"institute_id"?: string | null,"new_values"?: Json | null,"old_values"?: Json | null,"reason"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"entity"?: string,"entity_id"?: string | null,"id"?: never,"institute_id"?: string | null,"new_values"?: Json | null,"old_values"?: Json | null,"reason"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_logs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"batch_subjects": {
                  Row: {
                    "batch_id": string,"id": string,"institute_id": string,"subject_id": string,"teacher_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"id"?: string,"institute_id": string,"subject_id": string,"teacher_id"?: string | null
                  }
                  Update: {
                    "batch_id"?: string,"id"?: string,"institute_id"?: string,"subject_id"?: string,"teacher_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "batch_subjects_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_subjects_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_subjects_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_subjects_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "staff_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batch_subjects_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"batches": {
                  Row: {
                    "academic_year_id": string | null,"capacity": number | null,"class_days": (number)[],"class_id": string,"created_at": string,"end_date": string | null,"end_time": string | null,"id": string,"institute_id": string,"name": string,"room": string | null,"start_date": string | null,"start_time": string | null,"status": Database["public"]['Enums']["record_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_year_id"?: string | null,"capacity"?: number | null,"class_days"?: (number)[],"class_id": string,"created_at"?: string,"end_date"?: string | null,"end_time"?: string | null,"id"?: string,"institute_id": string,"name": string,"room"?: string | null,"start_date"?: string | null,"start_time"?: string | null,"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string
                  }
                  Update: {
                    "academic_year_id"?: string | null,"capacity"?: number | null,"class_days"?: (number)[],"class_id"?: string,"created_at"?: string,"end_date"?: string | null,"end_time"?: string | null,"id"?: string,"institute_id"?: string,"name"?: string,"room"?: string | null,"start_date"?: string | null,"start_time"?: string | null,"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "batches_academic_year_id_fkey"
      columns: ["academic_year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "batches_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"class_sessions": {
                  Row: {
                    "attendance_submitted_at": string | null,"attendance_submitted_by": string | null,"batch_id": string,"cancel_reason": string | null,"created_at": string,"end_time": string,"id": string,"institute_id": string,"rescheduled_from": string | null,"room": string | null,"session_date": string,"start_time": string,"status": Database["public"]['Enums']["session_status"],"subject_id": string | null,"teacher_id": string | null,"timetable_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attendance_submitted_at"?: string | null,"attendance_submitted_by"?: string | null,"batch_id": string,"cancel_reason"?: string | null,"created_at"?: string,"end_time": string,"id"?: string,"institute_id": string,"rescheduled_from"?: string | null,"room"?: string | null,"session_date": string,"start_time": string,"status"?: Database["public"]['Enums']["session_status"],"subject_id"?: string | null,"teacher_id"?: string | null,"timetable_id"?: string | null
                  }
                  Update: {
                    "attendance_submitted_at"?: string | null,"attendance_submitted_by"?: string | null,"batch_id"?: string,"cancel_reason"?: string | null,"created_at"?: string,"end_time"?: string,"id"?: string,"institute_id"?: string,"rescheduled_from"?: string | null,"room"?: string | null,"session_date"?: string,"start_time"?: string,"status"?: Database["public"]['Enums']["session_status"],"subject_id"?: string | null,"teacher_id"?: string | null,"timetable_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_sessions_attendance_submitted_by_fkey"
      columns: ["attendance_submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_rescheduled_from_fkey"
      columns: ["rescheduled_from"]
isOneToOne: false
      referencedRelation: "class_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "staff_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teachers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_sessions_timetable_id_fkey"
      columns: ["timetable_id"]
isOneToOne: false
      referencedRelation: "timetable"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "academic_year_id": string | null,"created_at": string,"description": string | null,"id": string,"institute_id": string,"name": string,"sort_order": number,"status": Database["public"]['Enums']["record_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_year_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id": string,"name": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string
                  }
                  Update: {
                    "academic_year_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id"?: string,"name"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classes_academic_year_id_fkey"
      columns: ["academic_year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classes_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"discounts": {
                  Row: {
                    "created_at": string,"description": string | null,"discount_type": string,"id": string,"institute_id": string,"is_scholarship": boolean,"name": string,"status": Database["public"]['Enums']["record_status"],"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"discount_type": string,"id"?: string,"institute_id": string,"is_scholarship"?: boolean,"name": string,"status"?: Database["public"]['Enums']["record_status"],"value": number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"discount_type"?: string,"id"?: string,"institute_id"?: string,"is_scholarship"?: boolean,"name"?: string,"status"?: Database["public"]['Enums']["record_status"],"value"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "discounts_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"examination_subjects": {
                  Row: {
                    "exam_date": string | null,"examination_id": string,"id": string,"institute_id": string,"max_marks": number,"passing_marks": number,"subject_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "exam_date"?: string | null,"examination_id": string,"id"?: string,"institute_id": string,"max_marks": number,"passing_marks": number,"subject_id": string
                  }
                  Update: {
                    "exam_date"?: string | null,"examination_id"?: string,"id"?: string,"institute_id"?: string,"max_marks"?: number,"passing_marks"?: number,"subject_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "examination_subjects_examination_id_fkey"
      columns: ["examination_id"]
isOneToOne: false
      referencedRelation: "examinations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examination_subjects_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examination_subjects_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"examinations": {
                  Row: {
                    "academic_year_id": string | null,"batch_id": string | null,"class_id": string | null,"created_at": string,"created_by": string | null,"end_date": string,"exam_type": Database["public"]['Enums']["exam_type"],"id": string,"institute_id": string,"name": string,"published_at": string | null,"published_by": string | null,"result_publish_date": string | null,"start_date": string,"status": Database["public"]['Enums']["exam_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_year_id"?: string | null,"batch_id"?: string | null,"class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"end_date": string,"exam_type": Database["public"]['Enums']["exam_type"],"id"?: string,"institute_id": string,"name": string,"published_at"?: string | null,"published_by"?: string | null,"result_publish_date"?: string | null,"start_date": string,"status"?: Database["public"]['Enums']["exam_status"],"updated_at"?: string
                  }
                  Update: {
                    "academic_year_id"?: string | null,"batch_id"?: string | null,"class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"end_date"?: string,"exam_type"?: Database["public"]['Enums']["exam_type"],"id"?: string,"institute_id"?: string,"name"?: string,"published_at"?: string | null,"published_by"?: string | null,"result_publish_date"?: string | null,"start_date"?: string,"status"?: Database["public"]['Enums']["exam_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "examinations_academic_year_id_fkey"
      columns: ["academic_year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examinations_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examinations_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examinations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examinations_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "examinations_published_by_fkey"
      columns: ["published_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"expense_categories": {
                  Row: {
                    "id": string,"institute_id": string,"is_system": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"institute_id": string,"is_system"?: boolean,"name": string
                  }
                  Update: {
                    "id"?: string,"institute_id"?: string,"is_system"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expense_categories_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"expenses": {
                  Row: {
                    "amount": number,"category_id": string,"created_at": string,"description": string | null,"id": string,"institute_id": string,"is_void": boolean,"method": Database["public"]['Enums']["payment_method"],"paid_to": string | null,"payment_date": string,"receipt_path": string | null,"recorded_by": string | null,"title": string,"void_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id": string,"is_void"?: boolean,"method": Database["public"]['Enums']["payment_method"],"paid_to"?: string | null,"payment_date": string,"receipt_path"?: string | null,"recorded_by"?: string | null,"title": string,"void_reason"?: string | null
                  }
                  Update: {
                    "amount"?: number,"category_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id"?: string,"is_void"?: boolean,"method"?: Database["public"]['Enums']["payment_method"],"paid_to"?: string | null,"payment_date"?: string,"receipt_path"?: string | null,"recorded_by"?: string | null,"title"?: string,"void_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "expense_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "expenses_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fee_obligations": {
                  Row: {
                    "amount_paid": number,"assignment_id": string | null,"category": Database["public"]['Enums']["fee_category"],"created_at": string,"created_by": string | null,"description": string,"discount_amount": number,"due_date": string,"gross_amount": number,"id": string,"installment_no": number | null,"institute_id": string,"late_fee_amount": number,"late_fee_applied_at": string | null,"net_amount": number | null,"period_end": string | null,"period_start": string | null,"status": Database["public"]['Enums']["obligation_status"],"student_id": string,"updated_at": string,"waived_at": string | null,"waived_by": string | null,"waived_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paid"?: number,"assignment_id"?: string | null,"category"?: Database["public"]['Enums']["fee_category"],"created_at"?: string,"created_by"?: string | null,"description": string,"discount_amount"?: number,"due_date": string,"gross_amount": number,"id"?: string,"installment_no"?: number | null,"institute_id": string,"late_fee_amount"?: number,"late_fee_applied_at"?: string | null,"net_amount"?: never,"period_end"?: string | null,"period_start"?: string | null,"status"?: Database["public"]['Enums']["obligation_status"],"student_id": string,"updated_at"?: string,"waived_at"?: string | null,"waived_by"?: string | null,"waived_reason"?: string | null
                  }
                  Update: {
                    "amount_paid"?: number,"assignment_id"?: string | null,"category"?: Database["public"]['Enums']["fee_category"],"created_at"?: string,"created_by"?: string | null,"description"?: string,"discount_amount"?: number,"due_date"?: string,"gross_amount"?: number,"id"?: string,"installment_no"?: number | null,"institute_id"?: string,"late_fee_amount"?: number,"late_fee_applied_at"?: string | null,"net_amount"?: never,"period_end"?: string | null,"period_start"?: string | null,"status"?: Database["public"]['Enums']["obligation_status"],"student_id"?: string,"updated_at"?: string,"waived_at"?: string | null,"waived_by"?: string | null,"waived_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fee_obligations_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "student_fee_assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_waived_by_fkey"
      columns: ["waived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fee_structures": {
                  Row: {
                    "category": Database["public"]['Enums']["fee_category"],"class_id": string | null,"created_at": string,"default_due_day": number | null,"description": string | null,"discount_eligible": boolean,"fee_type": Database["public"]['Enums']["fee_type"],"id": string,"installments": number,"institute_id": string,"late_fee_applicable": boolean,"name": string,"status": Database["public"]['Enums']["record_status"],"total_amount": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["fee_category"],"class_id"?: string | null,"created_at"?: string,"default_due_day"?: number | null,"description"?: string | null,"discount_eligible"?: boolean,"fee_type": Database["public"]['Enums']["fee_type"],"id"?: string,"installments"?: number,"institute_id": string,"late_fee_applicable"?: boolean,"name": string,"status"?: Database["public"]['Enums']["record_status"],"total_amount": number,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["fee_category"],"class_id"?: string | null,"created_at"?: string,"default_due_day"?: number | null,"description"?: string | null,"discount_eligible"?: boolean,"fee_type"?: Database["public"]['Enums']["fee_type"],"id"?: string,"installments"?: number,"institute_id"?: string,"late_fee_applicable"?: boolean,"name"?: string,"status"?: Database["public"]['Enums']["record_status"],"total_amount"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fee_structures_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_structures_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"grading_rules": {
                  Row: {
                    "grade": string,"id": string,"institute_id": string,"is_pass": boolean,"max_percentage": number,"min_percentage": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "grade": string,"id"?: string,"institute_id": string,"is_pass"?: boolean,"max_percentage": number,"min_percentage": number,"sort_order"?: number
                  }
                  Update: {
                    "grade"?: string,"id"?: string,"institute_id"?: string,"is_pass"?: boolean,"max_percentage"?: number,"min_percentage"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "grading_rules_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"guardians": {
                  Row: {
                    "alt_phone": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"institute_id": string,"phone": string,"profile_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_phone"?: string | null,"created_at"?: string,"email"?: string | null,"full_name": string,"id"?: string,"institute_id": string,"phone": string,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "alt_phone"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"institute_id"?: string,"phone"?: string,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardians_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guardians_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"homework": {
                  Row: {
                    "assigned_date": string,"attachment_paths": (string)[],"batch_id": string,"created_at": string,"created_by": string | null,"description": string | null,"due_at": string,"id": string,"institute_id": string,"is_published": boolean,"max_marks": number | null,"subject_id": string | null,"submission_enabled": boolean,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_date"?: string,"attachment_paths"?: (string)[],"batch_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_at": string,"id"?: string,"institute_id": string,"is_published"?: boolean,"max_marks"?: number | null,"subject_id"?: string | null,"submission_enabled"?: boolean,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_date"?: string,"attachment_paths"?: (string)[],"batch_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_at"?: string,"id"?: string,"institute_id"?: string,"is_published"?: boolean,"max_marks"?: number | null,"subject_id"?: string | null,"submission_enabled"?: boolean,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "homework_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"homework_submissions": {
                  Row: {
                    "attempt": number,"content": string | null,"feedback": string | null,"file_paths": (string)[],"homework_id": string,"id": string,"institute_id": string,"marks": number | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["submission_status"],"student_id": string,"submitted_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt"?: number,"content"?: string | null,"feedback"?: string | null,"file_paths"?: (string)[],"homework_id": string,"id"?: string,"institute_id": string,"marks"?: number | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"student_id": string,"submitted_at"?: string
                  }
                  Update: {
                    "attempt"?: number,"content"?: string | null,"feedback"?: string | null,"file_paths"?: (string)[],"homework_id"?: string,"id"?: string,"institute_id"?: string,"marks"?: number | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"student_id"?: string,"submitted_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "homework_submissions_homework_id_fkey"
      columns: ["homework_id"]
isOneToOne: false
      referencedRelation: "homework"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_submissions_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_submissions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_submissions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"income_categories": {
                  Row: {
                    "id": string,"institute_id": string,"is_system": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"institute_id": string,"is_system"?: boolean,"name": string
                  }
                  Update: {
                    "id"?: string,"institute_id"?: string,"is_system"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "income_categories_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"income_entries": {
                  Row: {
                    "amount": number,"category_id": string,"created_at": string,"description": string | null,"id": string,"institute_id": string,"is_void": boolean,"method": Database["public"]['Enums']["payment_method"],"received_date": string,"recorded_by": string | null,"reference": string | null,"title": string,"void_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category_id": string,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id": string,"is_void"?: boolean,"method": Database["public"]['Enums']["payment_method"],"received_date": string,"recorded_by"?: string | null,"reference"?: string | null,"title": string,"void_reason"?: string | null
                  }
                  Update: {
                    "amount"?: number,"category_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id"?: string,"is_void"?: boolean,"method"?: Database["public"]['Enums']["payment_method"],"received_date"?: string,"recorded_by"?: string | null,"reference"?: string | null,"title"?: string,"void_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "income_entries_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "income_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "income_entries_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "income_entries_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"institute_settings": {
                  Row: {
                    "admission_prefix": string,"allow_late_submission": boolean,"attendance_correction_hours": number,"currency": string,"current_academic_year_id": string | null,"default_due_day": number,"email_enabled": boolean,"excused_attendance_policy": string,"fee_reminder_days_after": (number)[],"fee_reminder_days_before": (number)[],"fee_reminder_on_due": boolean,"institute_id": string,"late_counts_as_present": boolean,"late_fee_enabled": boolean,"late_fee_grace_days": number,"late_fee_type": string,"late_fee_value": number,"max_upload_mb": number,"min_password_length": number,"notify_parent_on_absence": boolean,"payment_methods": (string)[],"receipt_footer": string | null,"receipt_prefix": string,"results_require_approval": boolean,"show_birthdays": boolean,"timezone": string,"updated_at": string,"whatsapp_enabled": boolean,"whatsapp_provider": NonNullable<Json>,"working_days": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "admission_prefix"?: string,"allow_late_submission"?: boolean,"attendance_correction_hours"?: number,"currency"?: string,"current_academic_year_id"?: string | null,"default_due_day"?: number,"email_enabled"?: boolean,"excused_attendance_policy"?: string,"fee_reminder_days_after"?: (number)[],"fee_reminder_days_before"?: (number)[],"fee_reminder_on_due"?: boolean,"institute_id": string,"late_counts_as_present"?: boolean,"late_fee_enabled"?: boolean,"late_fee_grace_days"?: number,"late_fee_type"?: string,"late_fee_value"?: number,"max_upload_mb"?: number,"min_password_length"?: number,"notify_parent_on_absence"?: boolean,"payment_methods"?: (string)[],"receipt_footer"?: string | null,"receipt_prefix"?: string,"results_require_approval"?: boolean,"show_birthdays"?: boolean,"timezone"?: string,"updated_at"?: string,"whatsapp_enabled"?: boolean,"whatsapp_provider"?: NonNullable<Json>,"working_days"?: (number)[]
                  }
                  Update: {
                    "admission_prefix"?: string,"allow_late_submission"?: boolean,"attendance_correction_hours"?: number,"currency"?: string,"current_academic_year_id"?: string | null,"default_due_day"?: number,"email_enabled"?: boolean,"excused_attendance_policy"?: string,"fee_reminder_days_after"?: (number)[],"fee_reminder_days_before"?: (number)[],"fee_reminder_on_due"?: boolean,"institute_id"?: string,"late_counts_as_present"?: boolean,"late_fee_enabled"?: boolean,"late_fee_grace_days"?: number,"late_fee_type"?: string,"late_fee_value"?: number,"max_upload_mb"?: number,"min_password_length"?: number,"notify_parent_on_absence"?: boolean,"payment_methods"?: (string)[],"receipt_footer"?: string | null,"receipt_prefix"?: string,"results_require_approval"?: boolean,"show_birthdays"?: boolean,"timezone"?: string,"updated_at"?: string,"whatsapp_enabled"?: boolean,"whatsapp_provider"?: NonNullable<Json>,"working_days"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "institute_settings_current_year_fk"
      columns: ["current_academic_year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "institute_settings_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: true
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"institutes": {
                  Row: {
                    "address": string | null,"created_at": string,"email": string | null,"id": string,"logo_path": string | null,"name": string,"phone": string | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"logo_path"?: string | null,"name": string,"phone"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"logo_path"?: string | null,"name"?: string,"phone"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"marks": {
                  Row: {
                    "entered_by": string | null,"examination_subject_id": string,"id": string,"institute_id": string,"is_absent": boolean,"obtained_marks": number | null,"remarks": string | null,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "entered_by"?: string | null,"examination_subject_id": string,"id"?: string,"institute_id": string,"is_absent"?: boolean,"obtained_marks"?: number | null,"remarks"?: string | null,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "entered_by"?: string | null,"examination_subject_id"?: string,"id"?: string,"institute_id"?: string,"is_absent"?: boolean,"obtained_marks"?: number | null,"remarks"?: string | null,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "marks_entered_by_fkey"
      columns: ["entered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marks_examination_subject_id_fkey"
      columns: ["examination_subject_id"]
isOneToOne: false
      referencedRelation: "examination_subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marks_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "marks_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_delivery_logs": {
                  Row: {
                    "channel": string,"created_at": string,"error": string | null,"id": number,"institute_id": string | null,"notification_id": string | null,"recipient": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "channel": string,"created_at"?: string,"error"?: string | null,"id"?: never,"institute_id"?: string | null,"notification_id"?: string | null,"recipient"?: string | null,"status": string
                  }
                  Update: {
                    "channel"?: string,"created_at"?: string,"error"?: string | null,"id"?: never,"institute_id"?: string | null,"notification_id"?: string | null,"recipient"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_delivery_logs_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_delivery_logs_notification_id_fkey"
      columns: ["notification_id"]
isOneToOne: false
      referencedRelation: "notifications"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "email": boolean,"in_app": boolean,"push": boolean,"type": string,"user_id": string,"whatsapp": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: boolean,"in_app"?: boolean,"push"?: boolean,"type": string,"user_id": string,"whatsapp"?: boolean
                  }
                  Update: {
                    "email"?: boolean,"in_app"?: boolean,"push"?: boolean,"type"?: string,"user_id"?: string,"whatsapp"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"dedupe_key": string | null,"id": string,"institute_id": string,"link": string | null,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"institute_id": string,"link"?: string | null,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"institute_id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"number_sequences": {
                  Row: {
                    "institute_id": string,"next_value": number,"seq_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "institute_id": string,"next_value"?: number,"seq_key": string
                  }
                  Update: {
                    "institute_id"?: string,"next_value"?: number,"seq_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "number_sequences_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"parent_students": {
                  Row: {
                    "created_at": string,"guardian_id": string,"id": string,"institute_id": string,"is_emergency_contact": boolean,"is_primary": boolean,"relationship": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"guardian_id": string,"id"?: string,"institute_id": string,"is_emergency_contact"?: boolean,"is_primary"?: boolean,"relationship"?: string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"guardian_id"?: string,"id"?: string,"institute_id"?: string,"is_emergency_contact"?: boolean,"is_primary"?: boolean,"relationship"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parent_students_guardian_id_fkey"
      columns: ["guardian_id"]
isOneToOne: false
      referencedRelation: "guardians"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_students_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parent_students_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_allocations": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"institute_id": string,"obligation_id": string,"payment_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"institute_id": string,"obligation_id": string,"payment_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"institute_id"?: string,"obligation_id"?: string,"payment_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_allocations_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_allocations_obligation_id_fkey"
      columns: ["obligation_id"]
isOneToOne: false
      referencedRelation: "fee_obligation_balances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_allocations_obligation_id_fkey"
      columns: ["obligation_id"]
isOneToOne: false
      referencedRelation: "fee_obligations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_allocations_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_reversals": {
                  Row: {
                    "amount": number,"id": string,"institute_id": string,"payment_id": string,"reason": string,"reversed_at": string,"reversed_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"id"?: string,"institute_id": string,"payment_id": string,"reason": string,"reversed_at"?: string,"reversed_by": string
                  }
                  Update: {
                    "amount"?: number,"id"?: string,"institute_id"?: string,"payment_id"?: string,"reason"?: string,"reversed_at"?: string,"reversed_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_reversals_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_reversals_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: true
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_reversals_reversed_by_fkey"
      columns: ["reversed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"corrects_payment_id": string | null,"created_at": string,"id": string,"idempotency_key": string,"institute_id": string,"method": Database["public"]['Enums']["payment_method"],"payment_date": string,"received_by": string | null,"reference": string | null,"remarks": string | null,"status": Database["public"]['Enums']["payment_status"],"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"corrects_payment_id"?: string | null,"created_at"?: string,"id"?: string,"idempotency_key": string,"institute_id": string,"method": Database["public"]['Enums']["payment_method"],"payment_date": string,"received_by"?: string | null,"reference"?: string | null,"remarks"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"student_id": string
                  }
                  Update: {
                    "amount"?: number,"corrects_payment_id"?: string | null,"created_at"?: string,"id"?: string,"idempotency_key"?: string,"institute_id"?: string,"method"?: Database["public"]['Enums']["payment_method"],"payment_date"?: string,"received_by"?: string | null,"reference"?: string | null,"remarks"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_corrects_payment_id_fkey"
      columns: ["corrects_payment_id"]
isOneToOne: false
      referencedRelation: "payments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_received_by_fkey"
      columns: ["received_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"email": string | null,"full_name": string,"id": string,"institute_id": string | null,"last_login_at": string | null,"phone": string | null,"status": Database["public"]['Enums']["account_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"institute_id"?: string | null,"last_login_at"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"institute_id"?: string | null,"last_login_at"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"published_results": {
                  Row: {
                    "examination_id": string,"grade": string | null,"id": string,"institute_id": string,"is_pass": boolean,"percentage": number,"published_at": string,"rank": number | null,"student_id": string,"subject_breakdown": NonNullable<Json>,"total_max": number,"total_obtained": number
                  }
                  ComputedFields: never
                  Insert: {
                    "examination_id": string,"grade"?: string | null,"id"?: string,"institute_id": string,"is_pass": boolean,"percentage": number,"published_at"?: string,"rank"?: number | null,"student_id": string,"subject_breakdown": NonNullable<Json>,"total_max": number,"total_obtained": number
                  }
                  Update: {
                    "examination_id"?: string,"grade"?: string | null,"id"?: string,"institute_id"?: string,"is_pass"?: boolean,"percentage"?: number,"published_at"?: string,"rank"?: number | null,"student_id"?: string,"subject_breakdown"?: NonNullable<Json>,"total_max"?: number,"total_obtained"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "published_results_examination_id_fkey"
      columns: ["examination_id"]
isOneToOne: false
      referencedRelation: "examinations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "published_results_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "published_results_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"receipts": {
                  Row: {
                    "id": string,"institute_id": string,"issued_at": string,"payment_id": string,"receipt_no": string,"snapshot": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"institute_id": string,"issued_at"?: string,"payment_id": string,"receipt_no": string,"snapshot": NonNullable<Json>
                  }
                  Update: {
                    "id"?: string,"institute_id"?: string,"issued_at"?: string,"payment_id"?: string,"receipt_no"?: string,"snapshot"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "receipts_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "receipts_payment_id_fkey"
      columns: ["payment_id"]
isOneToOne: true
      referencedRelation: "payments"
      referencedColumns: ["id"]
    }
                  ]
                },"student_batches": {
                  Row: {
                    "batch_id": string,"capacity_override_reason": string | null,"created_at": string,"created_by": string | null,"end_date": string | null,"end_reason": string | null,"id": string,"institute_id": string,"start_date": string,"status": Database["public"]['Enums']["batch_enrollment_status"],"student_id": string,"transferred_to": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"capacity_override_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"end_date"?: string | null,"end_reason"?: string | null,"id"?: string,"institute_id": string,"start_date"?: string,"status"?: Database["public"]['Enums']["batch_enrollment_status"],"student_id": string,"transferred_to"?: string | null
                  }
                  Update: {
                    "batch_id"?: string,"capacity_override_reason"?: string | null,"created_at"?: string,"created_by"?: string | null,"end_date"?: string | null,"end_reason"?: string | null,"id"?: string,"institute_id"?: string,"start_date"?: string,"status"?: Database["public"]['Enums']["batch_enrollment_status"],"student_id"?: string,"transferred_to"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_batches_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_batches_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_batches_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_batches_transferred_to_fkey"
      columns: ["transferred_to"]
isOneToOne: false
      referencedRelation: "student_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"student_documents": {
                  Row: {
                    "created_at": string,"file_path": string,"id": string,"institute_id": string,"mime_type": string | null,"size_bytes": number | null,"student_id": string,"title": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_path": string,"id"?: string,"institute_id": string,"mime_type"?: string | null,"size_bytes"?: number | null,"student_id": string,"title": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"file_path"?: string,"id"?: string,"institute_id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"student_id"?: string,"title"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_documents_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_documents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_documents_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_fee_assignments": {
                  Row: {
                    "base_amount": number,"batch_id": string | null,"category": Database["public"]['Enums']["fee_category"],"created_at": string,"created_by": string | null,"description": string,"discount_amount": number,"discount_approved_by": string | null,"discount_id": string | null,"discount_reason": string | null,"due_day": number,"fee_structure_id": string | null,"fee_type": Database["public"]['Enums']["fee_type"],"id": string,"installments": number,"institute_id": string,"late_fee_applicable": boolean,"net_amount": number | null,"scholarship_amount": number,"start_date": string,"status": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_amount": number,"batch_id"?: string | null,"category"?: Database["public"]['Enums']["fee_category"],"created_at"?: string,"created_by"?: string | null,"description": string,"discount_amount"?: number,"discount_approved_by"?: string | null,"discount_id"?: string | null,"discount_reason"?: string | null,"due_day": number,"fee_structure_id"?: string | null,"fee_type": Database["public"]['Enums']["fee_type"],"id"?: string,"installments"?: number,"institute_id": string,"late_fee_applicable"?: boolean,"net_amount"?: never,"scholarship_amount"?: number,"start_date": string,"status"?: string,"student_id": string
                  }
                  Update: {
                    "base_amount"?: number,"batch_id"?: string | null,"category"?: Database["public"]['Enums']["fee_category"],"created_at"?: string,"created_by"?: string | null,"description"?: string,"discount_amount"?: number,"discount_approved_by"?: string | null,"discount_id"?: string | null,"discount_reason"?: string | null,"due_day"?: number,"fee_structure_id"?: string | null,"fee_type"?: Database["public"]['Enums']["fee_type"],"id"?: string,"installments"?: number,"institute_id"?: string,"late_fee_applicable"?: boolean,"net_amount"?: never,"scholarship_amount"?: number,"start_date"?: string,"status"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_fee_assignments_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_fee_assignments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_fee_assignments_discount_approved_by_fkey"
      columns: ["discount_approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_fee_assignments_discount_id_fkey"
      columns: ["discount_id"]
isOneToOne: false
      referencedRelation: "discounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_fee_assignments_fee_structure_id_fkey"
      columns: ["fee_structure_id"]
isOneToOne: false
      referencedRelation: "fee_structures"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_fee_assignments_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_fee_assignments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_status_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"from_status": Database["public"]['Enums']["student_status"] | null,"id": string,"institute_id": string,"reason": string | null,"student_id": string,"to_status": Database["public"]['Enums']["student_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["student_status"] | null,"id"?: string,"institute_id": string,"reason"?: string | null,"student_id": string,"to_status": Database["public"]['Enums']["student_status"]
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["student_status"] | null,"id"?: string,"institute_id"?: string,"reason"?: string | null,"student_id"?: string,"to_status"?: Database["public"]['Enums']["student_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_status_history_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_status_history_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "academic_year_id": string | null,"address": string | null,"admission_date": string,"admission_no": string,"blood_group": string | null,"city": string | null,"class_id": string | null,"created_at": string,"created_by": string | null,"date_of_birth": string | null,"email": string | null,"full_name": string,"gender": Database["public"]['Enums']["gender"] | null,"id": string,"institute_id": string,"phone": string | null,"photo_path": string | null,"pin_code": string | null,"previous_academics": string | null,"profile_id": string | null,"school_name": string | null,"state": string | null,"status": Database["public"]['Enums']["student_status"],"subject_ids": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_year_id"?: string | null,"address"?: string | null,"admission_date"?: string,"admission_no": string,"blood_group"?: string | null,"city"?: string | null,"class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"email"?: string | null,"full_name": string,"gender"?: Database["public"]['Enums']["gender"] | null,"id"?: string,"institute_id": string,"phone"?: string | null,"photo_path"?: string | null,"pin_code"?: string | null,"previous_academics"?: string | null,"profile_id"?: string | null,"school_name"?: string | null,"state"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"subject_ids"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "academic_year_id"?: string | null,"address"?: string | null,"admission_date"?: string,"admission_no"?: string,"blood_group"?: string | null,"city"?: string | null,"class_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"email"?: string | null,"full_name"?: string,"gender"?: Database["public"]['Enums']["gender"] | null,"id"?: string,"institute_id"?: string,"phone"?: string | null,"photo_path"?: string | null,"pin_code"?: string | null,"previous_academics"?: string | null,"profile_id"?: string | null,"school_name"?: string | null,"state"?: string | null,"status"?: Database["public"]['Enums']["student_status"],"subject_ids"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_academic_year_id_fkey"
      columns: ["academic_year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_materials": {
                  Row: {
                    "batch_id": string | null,"class_id": string | null,"created_at": string,"description": string | null,"file_path": string,"id": string,"institute_id": string,"is_active": boolean,"mime_type": string | null,"size_bytes": number | null,"subject_id": string | null,"title": string,"uploaded_by": string | null,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"class_id"?: string | null,"created_at"?: string,"description"?: string | null,"file_path": string,"id"?: string,"institute_id": string,"is_active"?: boolean,"mime_type"?: string | null,"size_bytes"?: number | null,"subject_id"?: string | null,"title": string,"uploaded_by"?: string | null,"visibility"?: string
                  }
                  Update: {
                    "batch_id"?: string | null,"class_id"?: string | null,"created_at"?: string,"description"?: string | null,"file_path"?: string,"id"?: string,"institute_id"?: string,"is_active"?: boolean,"mime_type"?: string | null,"size_bytes"?: number | null,"subject_id"?: string | null,"title"?: string,"uploaded_by"?: string | null,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_materials_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_materials_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_materials_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_materials_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "study_materials_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"subjects": {
                  Row: {
                    "class_id": string | null,"code": string | null,"created_at": string,"description": string | null,"id": string,"institute_id": string,"name": string,"status": Database["public"]['Enums']["record_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id"?: string | null,"code"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id": string,"name": string,"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string | null,"code"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"institute_id"?: string,"name"?: string,"status"?: Database["public"]['Enums']["record_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subjects_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subjects_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_attendance": {
                  Row: {
                    "attendance_date": string,"created_at": string,"id": string,"institute_id": string,"marked_by": string | null,"remarks": string | null,"status": Database["public"]['Enums']["teacher_attendance_status"],"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendance_date": string,"created_at"?: string,"id"?: string,"institute_id": string,"marked_by"?: string | null,"remarks"?: string | null,"status": Database["public"]['Enums']["teacher_attendance_status"],"teacher_id": string
                  }
                  Update: {
                    "attendance_date"?: string,"created_at"?: string,"id"?: string,"institute_id"?: string,"marked_by"?: string | null,"remarks"?: string | null,"status"?: Database["public"]['Enums']["teacher_attendance_status"],"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_attendance_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_attendance_marked_by_fkey"
      columns: ["marked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_attendance_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "staff_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_attendance_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_batches": {
                  Row: {
                    "batch_id": string,"created_at": string,"end_date": string | null,"id": string,"institute_id": string,"is_active": boolean,"start_date": string,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"end_date"?: string | null,"id"?: string,"institute_id": string,"is_active"?: boolean,"start_date"?: string,"teacher_id": string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"end_date"?: string | null,"id"?: string,"institute_id"?: string,"is_active"?: boolean,"start_date"?: string,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_batches_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_batches_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_batches_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "staff_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_batches_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_salary_records": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"expense_id": string | null,"id": string,"institute_id": string,"method": Database["public"]['Enums']["payment_method"] | null,"paid_on": string | null,"remarks": string | null,"salary_month": string,"status": string,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"expense_id"?: string | null,"id"?: string,"institute_id": string,"method"?: Database["public"]['Enums']["payment_method"] | null,"paid_on"?: string | null,"remarks"?: string | null,"salary_month": string,"status"?: string,"teacher_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"expense_id"?: string | null,"id"?: string,"institute_id"?: string,"method"?: Database["public"]['Enums']["payment_method"] | null,"paid_on"?: string | null,"remarks"?: string | null,"salary_month"?: string,"status"?: string,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_salary_records_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_salary_records_expense_id_fkey"
      columns: ["expense_id"]
isOneToOne: true
      referencedRelation: "expenses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_salary_records_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_salary_records_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "staff_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teacher_salary_records_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"teachers": {
                  Row: {
                    "address": string | null,"created_at": string,"email": string | null,"employment_status": Database["public"]['Enums']["employment_status"],"full_name": string,"id": string,"institute_id": string,"joining_date": string | null,"monthly_salary": number | null,"phone": string,"photo_path": string | null,"profile_id": string | null,"qualification": string | null,"specialization": string | null,"subject_ids": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"employment_status"?: Database["public"]['Enums']["employment_status"],"full_name": string,"id"?: string,"institute_id": string,"joining_date"?: string | null,"monthly_salary"?: number | null,"phone": string,"photo_path"?: string | null,"profile_id"?: string | null,"qualification"?: string | null,"specialization"?: string | null,"subject_ids"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"created_at"?: string,"email"?: string | null,"employment_status"?: Database["public"]['Enums']["employment_status"],"full_name"?: string,"id"?: string,"institute_id"?: string,"joining_date"?: string | null,"monthly_salary"?: number | null,"phone"?: string,"photo_path"?: string | null,"profile_id"?: string | null,"qualification"?: string | null,"specialization"?: string | null,"subject_ids"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teachers_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teachers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"timetable": {
                  Row: {
                    "academic_year_id": string | null,"batch_id": string,"created_at": string,"created_by": string | null,"day_of_week": number,"effective_from": string,"effective_to": string | null,"end_time": string,"id": string,"institute_id": string,"is_active": boolean,"override_reason": string | null,"room": string | null,"start_time": string,"subject_id": string | null,"teacher_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_year_id"?: string | null,"batch_id": string,"created_at"?: string,"created_by"?: string | null,"day_of_week": number,"effective_from"?: string,"effective_to"?: string | null,"end_time": string,"id"?: string,"institute_id": string,"is_active"?: boolean,"override_reason"?: string | null,"room"?: string | null,"start_time": string,"subject_id"?: string | null,"teacher_id"?: string | null
                  }
                  Update: {
                    "academic_year_id"?: string | null,"batch_id"?: string,"created_at"?: string,"created_by"?: string | null,"day_of_week"?: number,"effective_from"?: string,"effective_to"?: string | null,"end_time"?: string,"id"?: string,"institute_id"?: string,"is_active"?: boolean,"override_reason"?: string | null,"room"?: string | null,"start_time"?: string,"subject_id"?: string | null,"teacher_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "timetable_academic_year_id_fkey"
      columns: ["academic_year_id"]
isOneToOne: false
      referencedRelation: "academic_years"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timetable_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timetable_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timetable_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timetable_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timetable_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "staff_directory"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timetable_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "teachers"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"institute_id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"institute_id": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"institute_id"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "fee_obligation_balances": {
                  Row: {
                    "amount_paid": number,"assignment_id": string | null,"balance": number | null,"category": Database["public"]['Enums']["fee_category"],"created_at": string,"created_by": string | null,"description": string,"discount_amount": number,"due_date": string,"effective_status": string | null,"gross_amount": number,"id": string,"installment_no": number | null,"institute_id": string,"late_fee_amount": number,"late_fee_applied_at": string | null,"net_amount": number | null,"period_end": string | null,"period_start": string | null,"status": Database["public"]['Enums']["obligation_status"],"student_id": string,"updated_at": string,"waived_at": string | null,"waived_by": string | null,"waived_reason": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "fee_obligations_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "student_fee_assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fee_obligations_waived_by_fkey"
      columns: ["waived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_directory": {
                  Row: {
                    "full_name": string,"id": string,"institute_id": string,"specialization": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "full_name"?: string | null,"id"?: string | null,"institute_id"?: string | null,"specialization"?: string | null
                         }
                        Update: {
                           "full_name"?: string | null,"id"?: string | null,"institute_id"?: string | null,"specialization"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "teachers_institute_id_fkey"
      columns: ["institute_id"]
isOneToOne: false
      referencedRelation: "institutes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "admin_dashboard":
{ Args: { "p_from": string,"p_to": string }; Returns: Json
                           },
"admit_student":
{ Args: { "p": Json }; Returns: Json
                           },
"apply_late_fees":
{ Args: { "p_institute"?: string }; Returns: number
                           },
"assign_student_fee":
{ Args: { "f": Json,"p_student": string }; Returns: Json
                           },
"attendance_summary":
{ Args: { "p_from"?: string,"p_student": string,"p_to"?: string }; Returns: {
              "absent": number,"attended": number,"excused": number,"late": number,"percentage": number,"total_sessions": number
            }[]
                           },
"auth_institute_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"can_read_file":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_read_material_file":
{ Args: { "p_name": string }; Returns: boolean
                           },
"can_view_student":
{ Args: { "p_student": string }; Returns: boolean
                           },
"can_write_file":
{ Args: { "p_name": string }; Returns: boolean
                           },
"change_student_status":
{ Args: { "p_reason": string,"p_status": Database["public"]['Enums']["student_status"],"p_student": string }; Returns: undefined
                           },
"correct_published_mark":
{ Args: { "p_absent": boolean,"p_mark": string,"p_obtained": number,"p_reason": string }; Returns: undefined
                           },
"family_dashboard":
{ Args: { "p_student": string }; Returns: Json
                           },
"fee_type_interval_months":
{ Args: { "p": Database["public"]['Enums']["fee_type"] }; Returns: number
                           },
"generate_class_sessions":
{ Args: { "p_from": string,"p_to": string }; Returns: number
                           },
"generate_fee_obligations":
{ Args: { "p_assignment": string }; Returns: number
                           },
"has_role":
{ Args: { "p_role": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_api_user":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_essential_notification":
{ Args: { "p_type": string }; Returns: boolean
                           },
"my_batch_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"my_student_batch_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"my_student_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"my_teacher_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"next_sequence_value":
{ Args: { "p_institute": string,"p_key": string }; Returns: number
                           },
"notify_student_and_parents":
{ Args: { "p_body": string,"p_dedupe": string,"p_link": string,"p_student": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"notify_user":
{ Args: { "p_body": string,"p_dedupe": string,"p_link": string,"p_title": string,"p_type": string,"p_user": string }; Returns: undefined
                           },
"obligation_base_status":
{ Args: { "p_current": Database["public"]['Enums']["obligation_status"],"p_net": number,"p_paid": number }; Returns: Database["public"]['Enums']["obligation_status"]
                           },
"pay_teacher_salary":
{ Args: { "p_method": Database["public"]['Enums']["payment_method"],"p_paid_on": string,"p_record": string,"p_remarks": string }; Returns: string
                           },
"publish_examination":
{ Args: { "p_exam": string,"p_reason"?: string }; Returns: number
                           },
"queue_absence_notification":
{ Args: { "p_session": string,"p_student": string }; Returns: undefined
                           },
"record_payment":
{ Args: { "p_amount": number,"p_corrects_payment"?: string,"p_idempotency_key": string,"p_method": Database["public"]['Enums']["payment_method"],"p_obligation_ids": (string)[],"p_payment_date": string,"p_reference": string,"p_remarks": string,"p_student": string }; Returns: Json
                           },
"reverse_payment":
{ Args: { "p_payment": string,"p_reason": string }; Returns: undefined
                           },
"seed_institute_defaults":
{ Args: { "p_inst": string }; Returns: undefined
                           },
"send_fee_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"submit_attendance":
{ Args: { "p_reason"?: string,"p_records": Json,"p_session": string }; Returns: number
                           },
"teacher_can_access_student":
{ Args: { "p_student": string }; Returns: boolean
                           },
"teacher_dashboard":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"transfer_student_batch":
{ Args: { "p_capacity_override"?: string,"p_date": string,"p_enrolment": string,"p_reason": string,"p_to_batch": string }; Returns: string
                           },
"waive_obligation":
{ Args: { "p_obligation": string,"p_reason": string }; Returns: undefined
                           },
"write_audit":
{ Args: { "p_action": string,"p_entity": string,"p_entity_id": string,"p_new"?: Json,"p_old"?: Json,"p_reason"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "account_status": "active"|"inactive"|"suspended"|"pending_activation","app_role": "admin"|"teacher"|"student"|"parent","attendance_status": "present"|"absent"|"late"|"excused","batch_enrollment_status": "active"|"transferred"|"ended","employment_status": "active"|"on_leave"|"resigned"|"terminated","exam_status": "draft"|"scheduled"|"marks_entry"|"pending_approval"|"published"|"cancelled","exam_type": "unit_test"|"weekly_test"|"monthly_test"|"half_yearly"|"final"|"practice","fee_category": "tuition"|"admission"|"registration"|"study_material"|"other","fee_type": "monthly"|"quarterly"|"half_yearly"|"yearly"|"course"|"custom","gender": "male"|"female"|"other","obligation_status": "unpaid"|"partially_paid"|"paid"|"waived"|"cancelled","payment_method": "cash"|"upi"|"bank_transfer"|"cheque"|"online"|"other","payment_status": "completed"|"reversed","record_status": "active"|"inactive","session_status": "scheduled"|"completed"|"cancelled"|"rescheduled","student_status": "active"|"inactive"|"on_hold"|"discontinued"|"completed","submission_status": "pending"|"submitted"|"late"|"reviewed"|"resubmission_required","teacher_attendance_status": "present"|"absent"|"late"|"leave"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "inactive", "suspended", "pending_activation"],"app_role": ["admin", "teacher", "student", "parent"],"attendance_status": ["present", "absent", "late", "excused"],"batch_enrollment_status": ["active", "transferred", "ended"],"employment_status": ["active", "on_leave", "resigned", "terminated"],"exam_status": ["draft", "scheduled", "marks_entry", "pending_approval", "published", "cancelled"],"exam_type": ["unit_test", "weekly_test", "monthly_test", "half_yearly", "final", "practice"],"fee_category": ["tuition", "admission", "registration", "study_material", "other"],"fee_type": ["monthly", "quarterly", "half_yearly", "yearly", "course", "custom"],"gender": ["male", "female", "other"],"obligation_status": ["unpaid", "partially_paid", "paid", "waived", "cancelled"],"payment_method": ["cash", "upi", "bank_transfer", "cheque", "online", "other"],"payment_status": ["completed", "reversed"],"record_status": ["active", "inactive"],"session_status": ["scheduled", "completed", "cancelled", "rescheduled"],"student_status": ["active", "inactive", "on_hold", "discontinued", "completed"],"submission_status": ["pending", "submitted", "late", "reviewed", "resubmission_required"],"teacher_attendance_status": ["present", "absent", "late", "leave"]
          }
        }
} as const

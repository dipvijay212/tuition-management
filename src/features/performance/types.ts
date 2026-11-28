export interface SubjectMark {
  subject_id: string;
  subject: string;
  max: number;
  passing: number;
  obtained: number | null;
  percentage: number;
  is_pass: boolean;
  is_absent: boolean;
}

export interface ExamTimelineItem {
  id: string;
  examination_id: string;
  exam_name: string;
  exam_type: string;
  start_date: string;
  end_date: string;
  total_obtained: number;
  total_max: number;
  percentage: number;
  grade: string | null;
  rank: number | null;
  is_pass: boolean;
  percentage_delta: number | null;
  marks_delta: number | null;
  rank_delta: number | null;
  batch_average: number | null;
  batch_highest: number | null;
  batch_difference: number | null;
  total_students_in_exam: number;
  /** Attendance % in the period since the previous exam (up to this exam's date). */
  attendance_pct: number | null;
  attendance_sessions: number;
  subjects: SubjectMark[];
}

export interface SubjectHistoryPoint {
  exam_name: string;
  date: string;
  percentage: number;
  obtained: number | null;
  max: number;
  is_pass: boolean;
}

export interface SubjectTrendItem {
  subject_id: string;
  subject_name: string;
  history: SubjectHistoryPoint[];
  current_percentage: number;
  average_percentage: number;
  delta: number | null;
  status: "strength" | "neutral" | "needs_attention";
  first_percentage: number;
  best_percentage: number;
  change_since_first: number | null;
}

export interface MonthlyAttendanceItem {
  month: string;
  attended: number;
  total: number;
  pct: number | null;
}

export interface PerformanceSummary {
  total_exams: number;
  passed_exams: number;
  pass_rate: number;
  current_percentage: number;
  previous_percentage: number | null;
  average_percentage: number;
  highest_percentage: number;
  lowest_percentage: number;
  latest_delta: number | null;
  net_improvement: number;
  /** Rolling trend: average of the last `trend_window` exams vs the window before. */
  trend: "improving" | "declining" | "steady";
  trend_delta: number | null;
  trend_window: number;
  recent_average: number | null;
  prior_average: number | null;
  /** Latest exam dropped noticeably but the rolling trend isn't declining. */
  latest_dip: boolean;
  first_percentage: number | null;
  first_exam_name: string | null;
  best_exam_name: string | null;
  latest_exam_name: string | null;
  current_rank_out_of: number | null;
  current_rank: number | null;
  rank_delta: number | null;
  attendance_percentage: number | null;
  attended_sessions: number;
  total_sessions: number;
}

export interface StudentPerformanceData {
  student: {
    id: string;
    full_name: string;
    admission_no: string;
    status: string;
    class_name: string | null;
    institute_name: string;
    batches: Array<{ id: string; name: string }>;
    photo_url: string | null;
  };
  summary: PerformanceSummary;
  timeline: ExamTimelineItem[];
  subject_trends: SubjectTrendItem[];
  attendance_history: MonthlyAttendanceItem[];
}

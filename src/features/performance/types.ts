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
  trend: "improving" | "declining" | "steady";
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
    roll_no: string | null;
    status: string;
    class_name: string | null;
    batches: Array<{ id: string; name: string }>;
    photo_url: string | null;
  };
  summary: PerformanceSummary;
  timeline: ExamTimelineItem[];
  subject_trends: SubjectTrendItem[];
  attendance_history: MonthlyAttendanceItem[];
}

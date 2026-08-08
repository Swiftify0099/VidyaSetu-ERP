import api from './api';

export interface ExamType {
  id: number;
  name: string;
  name_marathi?: string;
  academic_year_id: number;
  sequence: number;
  max_marks: number;
  passing_marks: number;
  is_grade_system: boolean;
  weightage: number;
  is_active: boolean;
}

export interface ExamSubject {
  id: number;
  exam_id: number;
  subject_name: string;
  subject_name_marathi?: string;
  subject_code?: string;
  max_marks: number;
  passing_marks: number;
  theory_max?: number;
  practical_max?: number;
  is_optional: boolean;
  sort_order: number;
}

export interface Exam {
  id: number;
  exam_type_id: number;
  academic_year_id: number;
  standard: string;
  exam_date_from?: string;
  exam_date_to?: string;
  result_declared: boolean;
  result_date?: string;
  exam_type?: ExamType;
  subjects: ExamSubject[];
}

export interface MarkRow {
  id?: number;
  student_id: number;
  student_name?: string;
  roll_number?: number;
  gr_number?: string;
  division?: string;
  marks_obtained?: number;
  theory_marks?: number;
  practical_marks?: number;
  is_absent?: boolean;
  is_exempted?: boolean;
  remarks?: string;
}

export interface SubjectMarkDetail {
  subject_id: number;
  subject_name: string;
  subject_name_marathi?: string;
  max_marks: number;
  passing_marks: number;
  marks_obtained?: number;
  theory_marks?: number;
  practical_marks?: number;
  grade?: string;
  is_absent: boolean;
  is_exempted: boolean;
  status: string;
}

export interface StudentResultDetail {
  student_id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division?: string;
  total_marks: number;
  max_marks: number;
  percentage: number;
  grade?: string;
  result: string;
  rank?: number;
  subjects_passed: number;
  subjects_failed: number;
  subjects_absent: number;
  subjects: SubjectMarkDetail[];
}

export interface ClassResultSummary {
  exam_id: number;
  standard: string;
  total_students: number;
  appeared: number;
  passed: number;
  failed: number;
  pass_percentage: number;
  class_average: number;
  highest_marks: number;
  lowest_marks: number;
  results: StudentResultDetail[];
}

export interface ExamStats {
  total_exams: number;
  results_declared: number;
  pending_results: number;
  total_students_examined: number;
}

const examService = {
  async getStats(academic_year_id: number): Promise<ExamStats> {
    const res = await api.get('/exams/stats', { params: { academic_year_id } });
    return res.data.data;
  },

  async getExamTypes(academic_year_id: number): Promise<ExamType[]> {
    const res = await api.get('/exams/types', { params: { academic_year_id } });
    return res.data.data;
  },
  async createExamType(data: Partial<ExamType>): Promise<ExamType> {
    const res = await api.post('/exams/types', data);
    return res.data.data;
  },

  async getExams(academic_year_id: number, standard: string): Promise<Exam[]> {
    const res = await api.get('/exams', { params: { academic_year_id, standard } });
    return res.data.data;
  },
  async createExam(data: { exam_type_id: number; academic_year_id: number; standard: string; exam_date_from?: string; exam_date_to?: string; subjects: Partial<ExamSubject>[] }): Promise<Exam> {
    const res = await api.post('/exams', data);
    return res.data.data;
  },
  async getExamById(id: number): Promise<Exam> {
    const res = await api.get(`/exams/${id}`);
    return res.data.data;
  },
  async addSubject(examId: number, data: Partial<ExamSubject>): Promise<ExamSubject> {
    const res = await api.post(`/exams/${examId}/subjects`, data);
    return res.data.data;
  },

  async bulkEnterMarks(examId: number, subjectId: number, marks: MarkRow[]): Promise<number> {
    const res = await api.post('/exams/marks/bulk', { exam_id: examId, exam_subject_id: subjectId, marks });
    return res.data.data.saved;
  },
  async getSubjectMarks(examId: number, subjectId: number, division?: string): Promise<MarkRow[]> {
    const res = await api.get(`/exams/${examId}/subjects/${subjectId}/marks`, { params: { division } });
    return res.data.data;
  },

  async compileResults(examId: number): Promise<number> {
    const res = await api.post(`/exams/${examId}/compile-results`, {});
    return res.data.data.students_processed;
  },
  async getClassResults(examId: number, division?: string): Promise<ClassResultSummary> {
    const res = await api.get(`/exams/${examId}/results`, { params: { division } });
    return res.data.data;
  },
};

export default examService;

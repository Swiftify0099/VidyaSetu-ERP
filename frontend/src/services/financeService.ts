import api from './api';

export interface FeeCategory {
  id: number;
  name: string;
  name_marathi?: string;
  description?: string;
  is_mandatory: boolean;
  is_recurring: boolean;
  frequency: string;
  sort_order: number;
  is_active: boolean;
}

export interface FeeStructure {
  id: number;
  academic_year_id: number;
  standard: string;
  division?: string;
  category_id: number;
  amount: number;
  due_date?: string;
  late_fine_per_day: number;
  category?: FeeCategory;
}

export interface StudentFeeRecord {
  id: number;
  student_id: number;
  academic_year_id: number;
  category_id: number;
  amount_due: number;
  amount_paid: number;
  concession_amount: number;
  fine_amount: number;
  due_date?: string;
  status: string;
  category?: FeeCategory;
}

export interface StudentFeeSummary {
  student_id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division?: string;
  total_due: number;
  total_paid: number;
  total_concession: number;
  total_fine: number;
  balance: number;
  records: StudentFeeRecord[];
}

export interface FeePayment {
  id: number;
  receipt_number: string;
  student_id: number;
  academic_year_id: number;
  payment_date: string;
  payment_mode: string;
  amount: number;
  late_fine: number;
  concession: number;
  total_received: number;
  transaction_id?: string;
  bank_name?: string;
  cheque_number?: string;
  remarks?: string;
  created_at?: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  expense_date: string;
  category: string;
  sub_category?: string;
  description: string;
  amount: number;
  payment_mode: string;
  payee?: string;
  bill_number?: string;
  bill_date?: string;
  remarks?: string;
  created_at?: string;
}

export interface DefaulterEntry {
  student_id: number;
  student_name: string;
  gr_number: string;
  standard: string;
  division?: string;
  contact_mobile?: string;
  total_due: number;
  total_paid: number;
  balance: number;
  overdue_since?: string;
}

export interface FinanceStats {
  total_fee_collected: number;
  total_fee_due: number;
  total_concessions: number;
  pending_amount: number;
  total_expenses: number;
  net_balance: number;
  defaulter_count: number;
  collection_this_month: number;
  expense_this_month: number;
  total_students_with_dues: number;
}

const financeService = {
  async getStats(academic_year_id?: number): Promise<FinanceStats> {
    const res = await api.get('/finance/stats', { params: academic_year_id ? { academic_year_id } : {} });
    return res.data.data;
  },

  // Categories
  async getCategories(): Promise<FeeCategory[]> {
    const res = await api.get('/finance/categories');
    return res.data.data;
  },
  async createCategory(data: Partial<FeeCategory>): Promise<FeeCategory> {
    const res = await api.post('/finance/categories', data);
    return res.data.data;
  },
  async updateCategory(id: number, data: Partial<FeeCategory>): Promise<FeeCategory> {
    const res = await api.put(`/finance/categories/${id}`, data);
    return res.data.data;
  },
  async deleteCategory(id: number): Promise<void> {
    await api.delete(`/finance/categories/${id}`);
  },

  // Fee Structure
  async getFeeStructure(academic_year_id: number, standard?: string): Promise<FeeStructure[]> {
    const res = await api.get('/finance/structure', { params: { academic_year_id, standard } });
    return res.data.data;
  },
  async upsertFeeStructure(data: Partial<FeeStructure>): Promise<FeeStructure> {
    const res = await api.post('/finance/structure', data);
    return res.data.data;
  },
  async deleteFeeStructure(id: number): Promise<void> {
    await api.delete(`/finance/structure/${id}`);
  },

  // Student Search
  async searchStudents(query: string): Promise<any[]> {
    const res = await api.get('/finance/student/search', { params: { query } });
    return res.data.data;
  },

  // Student Fees
  async getStudentFees(studentId: number, academic_year_id: number): Promise<StudentFeeSummary> {
    const res = await api.get(`/finance/student/${studentId}/fees`, { params: { academic_year_id } });
    return res.data.data;
  },
  async generateFeeRecords(studentId: number, academic_year_id: number, standard: string): Promise<number> {
    const res = await api.post(`/finance/student/${studentId}/generate-records`, null, {
      params: { academic_year_id, standard },
    });
    return res.data.data.count;
  },

  // Collection
  async collectFee(data: {
    student_id: number;
    academic_year_id: number;
    fee_record_ids: number[];
    payment_date: string;
    payment_mode: string;
    amount: number;
    late_fine?: number;
    concession?: number;
    transaction_id?: string;
    bank_name?: string;
    cheque_number?: string;
    remarks?: string;
  }): Promise<FeePayment> {
    const res = await api.post('/finance/collect', data);
    return res.data.data;
  },

  async getPaymentHistory(studentId: number, academic_year_id?: number): Promise<FeePayment[]> {
    const res = await api.get(`/finance/student/${studentId}/payment-history`, {
      params: academic_year_id ? { academic_year_id } : {},
    });
    return res.data.data;
  },

  async getDefaulters(academic_year_id: number, standard?: string): Promise<DefaulterEntry[]> {
    const res = await api.get('/finance/defaulters', { params: { academic_year_id, standard } });
    return res.data.data;
  },

  // Student Installments
  async getStudentInstallments(studentId: number, academic_year_id?: number): Promise<any[]> {
    const res = await api.get(`/finance/student/${studentId}/installments`, {
      params: academic_year_id ? { academic_year_id } : {},
    });
    return res.data.data;
  },

  async createStudentInstallment(studentId: number, data: {
    academic_year_id?: number;
    installment_name: string;
    amount: number;
    due_date: string;
    remarks?: string;
  }): Promise<any> {
    const res = await api.post(`/finance/student/${studentId}/installments`, data);
    return res.data;
  },

  async deleteStudentInstallment(instId: number): Promise<any> {
    const res = await api.delete(`/finance/installments/${instId}`);
    return res.data;
  },


  // Expenses
  async getExpenses(params?: { category?: string; from_date?: string; to_date?: string; page?: number; academic_year_id?: number }): Promise<{ items: Expense[]; meta: any }> {
    const res = await api.get('/finance/expenses', { params });
    return res.data.data;
  },
  async createExpense(data: Partial<Expense> & { expense_date: string; category: string; description: string; amount: number }): Promise<Expense> {
    const res = await api.post('/finance/expenses', data);
    return res.data.data;
  },
  async deleteExpense(id: number): Promise<void> {
    await api.delete(`/finance/expenses/${id}`);
  },
};

export default financeService;

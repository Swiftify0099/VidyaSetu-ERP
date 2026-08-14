/**
 * VidyaSetu Mobile — API Service (Complete)
 * Connects to the VidyaSetu ERP backend.
 * All endpoint groups matching the Web ERP.
 */
import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Keys ─────────────────────────────────────────────────
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vs_access_token',
  REFRESH_TOKEN: 'vs_refresh_token',
  USER: 'vs_user',
  LANGUAGE: 'vs_language',
  THEME: 'vs_theme',
};

// ── Base URLs ────────────────────────────────────────────
// Priority 1: Local machine backend (dev only)
const LOCAL_HOST_URL    = 'http://localhost:8000/api/v1';
const EMULATOR_HOST_URL = 'http://10.0.2.2:8000/api/v1';

// Default local URL for platform: Android emulator uses 10.0.2.2 to reach host PC
let LOCAL_BASE_URL = Platform.OS === 'android' ? EMULATOR_HOST_URL : LOCAL_HOST_URL;

// Priority 2: Render cloud backend (production — always available)
const RENDER_BASE_URL = 'https://vidyasetu-erp.onrender.com/api/v1';
// Production URL (used in release builds)
const PROD_BASE_URL = RENDER_BASE_URL;

/**
 * Start with local backend in DEV mode.
 * The response interceptor automatically falls back
 * to the Render backend when local is unreachable.
 */
const INITIAL_BASE_URL = __DEV__ ? LOCAL_BASE_URL : PROD_BASE_URL;

// Track which backend is currently active
let activeBaseURL = INITIAL_BASE_URL;
let usingFallback = false;
let fallbackCheckInProgress = false;

/** Silently probe local backend; returns true if reachable */
async function isLocalReachable(): Promise<boolean> {
  const probeUrls = Platform.OS === 'android'
    ? [EMULATOR_HOST_URL, LOCAL_HOST_URL]
    : [LOCAL_HOST_URL, EMULATOR_HOST_URL];

  for (const baseUrl of probeUrls) {
    try {
      const res = await axios.get(`${baseUrl}/health`, { timeout: 3000 });
      if (res.data?.status === 'healthy' || res.status === 200) {
        LOCAL_BASE_URL = baseUrl;
        setBaseURL(baseUrl);
        return true;
      }
    } catch {
      /* continue to next candidate */
    }
  }

  return false;
}

/** Switch the active base URL and update the axios instance */
function setBaseURL(url: string) {
  activeBaseURL = url;
  api.defaults.baseURL = url;
}

// ── Axios Instance ────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: INITIAL_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * On first load in DEV mode, check if local backend is alive.
 * If not, switch immediately to Render (production backend).
 */
if (__DEV__) {
  isLocalReachable().then(reachable => {
    if (!reachable && !usingFallback) {
      usingFallback = true;
      setBaseURL(RENDER_BASE_URL);
      console.log(
        '[API] Local backend unreachable. Using Render fallback:',
        RENDER_BASE_URL,
      );
    } else {
      console.log('[API] Local backend active:', activeBaseURL);
    }
  });
}

// ── Request Interceptor — attach JWT ─────────────────────
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor ─────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    // ── Auto-fallback: if local backend drops mid-session, switch to Render ──
    if (
      __DEV__ &&
      !error.response &&                  // no HTTP response = network/connection error
      !usingFallback &&                   // not already on fallback
      !fallbackCheckInProgress &&
      activeBaseURL === LOCAL_BASE_URL    // currently using local
    ) {
      fallbackCheckInProgress = true;
      const localAlive = await isLocalReachable();
      fallbackCheckInProgress = false;

      if (!localAlive) {
        usingFallback = true;
        setBaseURL(RENDER_BASE_URL);
        console.log('[API] Local went offline mid-session → switched to Render:', RENDER_BASE_URL);

        // Retry the failed request with the new URL
        const retryConfig = error.config as any;
        if (retryConfig && !retryConfig._fallbackRetry) {
          retryConfig._fallbackRetry = true;
          retryConfig.baseURL = RENDER_BASE_URL;
          retryConfig.url = retryConfig.url?.replace(LOCAL_BASE_URL, '') ?? retryConfig.url;
          return api(retryConfig);
        }
      }
    }

    // ── Also try recovering: if on Render fallback and local comes back ──
    if (
      __DEV__ &&
      !error.response &&
      usingFallback &&
      !fallbackCheckInProgress
    ) {
      fallbackCheckInProgress = true;
      const localAlive = await isLocalReachable();
      fallbackCheckInProgress = false;

      if (localAlive) {
        usingFallback = false;
        setBaseURL(LOCAL_BASE_URL);
        console.log('[API] Local backend back online → switched back to local:', LOCAL_BASE_URL);
      }
    }

    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED';
      error.message = isTimeout
        ? 'Request timed out. Please check your internet connection.'
        : `Cannot connect to server.\nRender: ${RENDER_BASE_URL}\nLocal: ${LOCAL_BASE_URL}`;
    }

    const originalRequest = error.config as any;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      isRefreshing = true;
      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const res = await axios.post(`${activeBaseURL}/auth/refresh`, { refresh_token: refreshToken }, { timeout: 15000 });
          const newToken = res.data?.data?.access_token ?? res.data?.access_token;
          if (newToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newToken);
            api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
            refreshQueue.forEach(cb => cb(newToken));
            refreshQueue = [];
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        // refresh failed — clear storage
      } finally {
        isRefreshing = false;
      }
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
    }
    return Promise.reject(error);
  }
);

export default api;

// ─────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────
export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
};

// ─────────────────────────────────────────────────────────
// STUDENTS API
// ─────────────────────────────────────────────────────────
export const studentsAPI = {
  list: (params?: Record<string, any>) => api.get('/students', { params }),
  get: (id: number) => api.get(`/students/${id}`),
  create: (data: object) => api.post('/students', data),
  update: (id: number, data: object) => api.patch(`/students/${id}`, data),
  delete: (id: number) => api.delete(`/students/${id}`),
  getAttendanceSummary: (id: number, params?: Record<string, any>) =>
    api.get(`/students/${id}/attendance-summary`, { params }),
  getResults: (id: number, params?: Record<string, any>) =>
    api.get(`/students/${id}/results`, { params }),
  getFeeStatus: (id: number, params?: Record<string, any>) =>
    api.get(`/students/${id}/fee-status`, { params }),
};

// ─────────────────────────────────────────────────────────
// ATTENDANCE API
// ─────────────────────────────────────────────────────────
export const attendanceAPI = {
  // GET /attendance/student/roster (att_date, standard, division, academic_year_id, period)
  getClassAttendance: (standard: string, division: string, att_date: string, academic_year_id = 1) =>
    api.get('/attendance/student/roster', { params: { standard, division, att_date, academic_year_id } }),
  // POST /attendance/student/bulk
  markAttendance: (data: object) =>
    api.post('/attendance/student/bulk', data),
  // GET /attendance/student/{id}/month (year, month)
  getStudentMonthAttendance: (studentId: number, year: number, month: number) =>
    api.get(`/attendance/student/${studentId}/month`, { params: { year, month } }),
  // GET /attendance/teacher/day (att_date, academic_year_id)
  getTeacherDay: (att_date: string, academic_year_id = 1) =>
    api.get('/attendance/teacher/day', { params: { att_date, academic_year_id } }),
  // POST /attendance/teacher/bulk
  markTeacherAttendance: (data: object) =>
    api.post('/attendance/teacher/bulk', data),
  // GET /attendance/class/sessions
  getClassSessions: (standard: string, academic_year_id: number, year: number, month: number) =>
    api.get('/attendance/class/sessions', { params: { standard, academic_year_id, year, month } }),
  // GET /attendance/defaulters
  getDefaulters: (academic_year_id: number, year: number, month: number, standard?: string) =>
    api.get('/attendance/defaulters', { params: { academic_year_id, year, month, standard } }),
  // GET /attendance/holidays (year, month)
  getHolidays: (year: number, month: number) =>
    api.get('/attendance/holidays', { params: { year, month } }),
  // GET /attendance/stats
  getStats: (academic_year_id: number) =>
    api.get('/attendance/stats', { params: { academic_year_id } }),
};

// ─────────────────────────────────────────────────────────
// FINANCE API
// ─────────────────────────────────────────────────────────
export const financeAPI = {
  getStudentFees: (studentId: number, academic_year: string) =>
    api.get(`/finance/students/${studentId}/fee-status`, { params: { academic_year } }),
  getRecentReceipts: (params?: Record<string, any>) =>
    api.get('/finance/receipts', { params }),
  collectFee: (data: object) => api.post('/finance/collect', data),
  getStudentBalance: (gr_number: string) =>
    api.get('/finance/student-balance', { params: { gr_number } }),
  getFeeStructure: (params?: Record<string, any>) =>
    api.get('/finance/fee-structure', { params }),
  createFeeStructure: (data: object) => api.post('/finance/fee-structure', data),
  updateFeeStructure: (id: number, data: object) =>
    api.patch(`/finance/fee-structure/${id}`, data),
  getOverdueFees: (params?: Record<string, any>) =>
    api.get('/finance/overdue', { params }),
  getSummary: (params?: Record<string, any>) =>
    api.get('/finance/summary', { params }),
  getReceipt: (receiptId: number) => api.get(`/finance/receipts/${receiptId}`),
  getMyFeeStatus: (params?: Record<string, any>) =>
    api.get('/finance/my-fees', { params }),
};

// ─────────────────────────────────────────────────────────
// COMMUNICATION API
// ─────────────────────────────────────────────────────────
export const communicationAPI = {
  getAnnouncements: (params?: Record<string, any>) =>
    api.get('/communication/announcements', { params }),
  getAnnouncement: (id: number) => api.get(`/communication/announcements/${id}`),
  createAnnouncement: (data: object) => api.post('/communication/announcements', data),
  updateAnnouncement: (id: number, data: object) =>
    api.patch(`/communication/announcements/${id}`, data),
  deleteAnnouncement: (id: number) =>
    api.delete(`/communication/announcements/${id}`),
  markRead: (id: number) =>
    api.patch(`/communication/announcements/${id}/read`),
  getMessages: (params?: Record<string, any>) =>
    api.get('/communication/messages', { params }),
  sendMessage: (data: object) => api.post('/communication/messages', data),
  getConversation: (userId: number, params?: Record<string, any>) =>
    api.get(`/communication/messages/${userId}`, { params }),
  getSMSTemplates: () => api.get('/communication/sms-templates'),
  sendSMS: (data: object) => api.post('/communication/sms/send', data),
  getEmailTemplates: () => api.get('/communication/email-templates'),
};

// ─────────────────────────────────────────────────────────
// EXAM API
// ─────────────────────────────────────────────────────────
export const examAPI = {
  getExamTypes: () => api.get('/exam/types'),
  getSchedules: (params?: Record<string, any>) =>
    api.get('/exam/schedules', { params }),
  getSchedule: (id: number) => api.get(`/exam/schedules/${id}`),
  createSchedule: (data: object) => api.post('/exam/schedules', data),
  updateSchedule: (id: number, data: object) =>
    api.patch(`/exam/schedules/${id}`, data),
  deleteSchedule: (id: number) => api.delete(`/exam/schedules/${id}`),
  getMarks: (examId: number, params?: Record<string, any>) =>
    api.get(`/exam/schedules/${examId}/marks`, { params }),
  submitMarks: (examId: number, data: object) =>
    api.post(`/exam/schedules/${examId}/marks`, data),
  updateMarks: (examId: number, data: object) =>
    api.patch(`/exam/schedules/${examId}/marks`, data),
  getResults: (params?: Record<string, any>) =>
    api.get('/exam/results', { params }),
  getMyResults: (params?: Record<string, any>) =>
    api.get('/exam/my-results', { params }),
  getReportCard: (studentId: number, params?: Record<string, any>) =>
    api.get(`/exam/report-card/${studentId}`, { params }),
  getChildResults: (childId: number, params?: Record<string, any>) =>
    api.get(`/exam/results/child/${childId}`, { params }),
  getSubjectsForExam: (examId: number) =>
    api.get(`/exam/schedules/${examId}/subjects`),
};

// ─────────────────────────────────────────────────────────
// HOMEWORK API
// ─────────────────────────────────────────────────────────
export const homeworkAPI = {
  list: (params?: Record<string, any>) => api.get('/homework', { params }),
  get: (id: number) => api.get(`/homework/${id}`),
  create: (data: object) => api.post('/homework', data),
  update: (id: number, data: object) => api.patch(`/homework/${id}`, data),
  delete: (id: number) => api.delete(`/homework/${id}`),
  getMyHomework: (params?: Record<string, any>) =>
    api.get('/homework/my', { params }),
  getChildHomework: (childId: number, params?: Record<string, any>) =>
    api.get(`/homework/child/${childId}`, { params }),
  submit: (homeworkId: number, data: object) =>
    api.post(`/homework/${homeworkId}/submit`, data),
  getSubmissions: (homeworkId: number) =>
    api.get(`/homework/${homeworkId}/submissions`),
  gradeSubmission: (homeworkId: number, submissionId: number, data: object) =>
    api.patch(`/homework/${homeworkId}/submissions/${submissionId}/grade`, data),
  getSubjectsList: (params?: Record<string, any>) =>
    api.get('/homework/subjects', { params }),
};

// ─────────────────────────────────────────────────────────
// LEAVE API
// ─────────────────────────────────────────────────────────
export const leaveAPI = {
  getBalance: (academic_year: string) =>
    api.get('/leave/balance', { params: { academic_year } }),
  getMyApplications: (params?: Record<string, any>) =>
    api.get('/leave/my-applications', { params }),
  apply: (data: object) => api.post('/leave/apply', data),
  getPending: (params?: Record<string, any>) =>
    api.get('/leave/pending', { params }),
  getAllApplications: (params?: Record<string, any>) =>
    api.get('/leave/all', { params }),
  approve: (id: number, remarks?: string) =>
    api.patch(`/leave/${id}/approve`, { remarks }),
  reject: (id: number, remarks: string) =>
    api.patch(`/leave/${id}/reject`, { remarks }),
  cancel: (id: number) => api.patch(`/leave/${id}/cancel`),
  getLeaveTypes: () => api.get('/leave/types'),
  getApplication: (id: number) => api.get(`/leave/${id}`),
};

// ─────────────────────────────────────────────────────────
// TIMETABLE API
// ─────────────────────────────────────────────────────────
export const timetableAPI = {
  getByClass: (params?: Record<string, any>) =>
    api.get('/timetable/class', { params }),
  getByTeacher: (params?: Record<string, any>) =>
    api.get('/timetable/teacher', { params }),
  getForUser: () => api.get('/timetable/my'),
  create: (data: object) => api.post('/timetable', data),
  update: (id: number, data: object) => api.patch(`/timetable/${id}`, data),
  delete: (id: number) => api.delete(`/timetable/${id}`),
  getSubjects: (params?: Record<string, any>) =>
    api.get('/timetable/subjects', { params }),
  getTeachers: (params?: Record<string, any>) =>
    api.get('/timetable/teachers', { params }),
  getPeriods: () => api.get('/timetable/periods'),
};

// ─────────────────────────────────────────────────────────
// LIBRARY API
// ─────────────────────────────────────────────────────────
export const libraryAPI = {
  getBooks: (params?: Record<string, any>) =>
    api.get('/library/books', { params }),
  getBook: (id: number) => api.get(`/library/books/${id}`),
  createBook: (data: object) => api.post('/library/books', data),
  updateBook: (id: number, data: object) =>
    api.patch(`/library/books/${id}`, data),
  deleteBook: (id: number) => api.delete(`/library/books/${id}`),
  issueBook: (data: object) => api.post('/library/issue', data),
  returnBook: (issueId: number, data?: object) =>
    api.post(`/library/return/${issueId}`, data),
  getIssued: (params?: Record<string, any>) =>
    api.get('/library/issued', { params }),
  getStats: () => api.get('/library/stats'),
  getMembers: (params?: Record<string, any>) =>
    api.get('/library/members', { params }),
  searchBooks: (query: string) =>
    api.get('/library/books', { params: { search: query } }),
  getMyBorrowHistory: () => api.get('/library/my-history'),
  getCategories: () => api.get('/library/categories'),
};

// ─────────────────────────────────────────────────────────
// TRANSPORT API
// ─────────────────────────────────────────────────────────
export const transportAPI = {
  getRoutes: (params?: Record<string, any>) =>
    api.get('/transport/routes', { params }),
  getRoute: (id: number) => api.get(`/transport/routes/${id}`),
  createRoute: (data: object) => api.post('/transport/routes', data),
  updateRoute: (id: number, data: object) =>
    api.patch(`/transport/routes/${id}`, data),
  deleteRoute: (id: number) => api.delete(`/transport/routes/${id}`),
  getVehicles: (params?: Record<string, any>) =>
    api.get('/transport/vehicles', { params }),
  getVehicle: (id: number) => api.get(`/transport/vehicles/${id}`),
  createVehicle: (data: object) => api.post('/transport/vehicles', data),
  updateVehicle: (id: number, data: object) =>
    api.patch(`/transport/vehicles/${id}`, data),
  deleteVehicle: (id: number) => api.delete(`/transport/vehicles/${id}`),
  getStudents: (params?: Record<string, any>) =>
    api.get('/transport/students', { params }),
  assignStudent: (data: object) => api.post('/transport/students/assign', data),
  unassignStudent: (studentId: number) =>
    api.delete(`/transport/students/${studentId}`),
  getStats: () => api.get('/transport/stats'),
};

// ─────────────────────────────────────────────────────────
// INVENTORY API
// ─────────────────────────────────────────────────────────
export const inventoryAPI = {
  getItems: (params?: Record<string, any>) =>
    api.get('/inventory/items', { params }),
  getItem: (id: number) => api.get(`/inventory/items/${id}`),
  createItem: (data: object) => api.post('/inventory/items', data),
  updateItem: (id: number, data: object) =>
    api.patch(`/inventory/items/${id}`, data),
  deleteItem: (id: number) => api.delete(`/inventory/items/${id}`),
  issueItem: (data: object) => api.post('/inventory/issues', data),
  getIssuedItems: (params?: Record<string, any>) =>
    api.get('/inventory/issues', { params }),
  getStats: () => api.get('/inventory/stats'),
  getCategories: () => api.get('/inventory/categories'),
};

// ─────────────────────────────────────────────────────────
// LESSON PLAN API
// ─────────────────────────────────────────────────────────
export const lessonPlanAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/lesson-plans', { params }),
  get: (id: number) => api.get(`/lesson-plans/${id}`),
  create: (data: object) => api.post('/lesson-plans', data),
  update: (id: number, data: object) =>
    api.patch(`/lesson-plans/${id}`, data),
  delete: (id: number) => api.delete(`/lesson-plans/${id}`),
  submit: (id: number) => api.patch(`/lesson-plans/${id}/submit`),
  approve: (id: number, remarks?: string) =>
    api.patch(`/lesson-plans/${id}/approve`, { remarks }),
  reject: (id: number, remarks: string) =>
    api.patch(`/lesson-plans/${id}/reject`, { remarks }),
  getSubjects: (params?: Record<string, any>) =>
    api.get('/lesson-plans/subjects', { params }),
};

// ─────────────────────────────────────────────────────────
// BEHAVIOUR LOG API
// ─────────────────────────────────────────────────────────
export const behaviourAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/behaviour', { params }),
  get: (id: number) => api.get(`/behaviour/${id}`),
  create: (data: object) => api.post('/behaviour', data),
  update: (id: number, data: object) =>
    api.patch(`/behaviour/${id}`, data),
  delete: (id: number) => api.delete(`/behaviour/${id}`),
  getStudentHistory: (studentId: number, params?: Record<string, any>) =>
    api.get(`/behaviour/student/${studentId}`, { params }),
  getCategories: () => api.get('/behaviour/categories'),
};

// ─────────────────────────────────────────────────────────
// ADMISSION API
// ─────────────────────────────────────────────────────────
export const admissionAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/admission', { params }),
  get: (id: number) => api.get(`/admission/${id}`),
  create: (data: object) => api.post('/admission', data),
  update: (id: number, data: object) =>
    api.patch(`/admission/${id}`, data),
  approve: (id: number) => api.patch(`/admission/${id}/approve`),
  reject: (id: number, reason?: string) =>
    api.patch(`/admission/${id}/reject`, { reason }),
  getGREntries: (params?: Record<string, any>) =>
    api.get('/admission/gr', { params }),
  getNextGR: () => api.get('/admission/gr/next'),
  getPromotionClasses: (params?: Record<string, any>) =>
    api.get('/admission/promotions/classes', { params }),
  bulkPromote: (data: object) =>
    api.post('/admission/promotions/bulk', data),
};

// ─────────────────────────────────────────────────────────
// ANALYTICS API — Real-data analytics endpoints
// ─────────────────────────────────────────────────────────
export const analyticsAPI = {
  // Backward-compat alias used by DashboardScreen
  getSummary: (params?: Record<string, any>) =>
    api.get('/analytics/summary', { params }),

  // Full dashboard KPIs
  getDashboard: (params?: { academic_year_id?: number }) =>
    api.get('/analytics/dashboard', { params }),

  // Student analytics
  getStudents: (params?: { academic_year_id?: number }) =>
    api.get('/analytics/students', { params }),

  // Attendance analytics
  getAttendance: (params?: { academic_year_id?: number; standard?: string; division?: string }) =>
    api.get('/analytics/attendance', { params }),
  getAttendanceTrend: (params?: { academic_year_id?: number; standard?: string; division?: string }) =>
    api.get('/analytics/attendance/trend', { params }),
  getLowAttendance: (params?: { academic_year_id?: number; threshold_pct?: number; standard?: string; limit?: number }) =>
    api.get('/analytics/attendance/low', { params }),

  // Fee analytics
  getFees: (params?: { academic_year_id?: number }) =>
    api.get('/analytics/fees', { params }),
  getFeeClasses: (params?: { academic_year_id?: number; standard?: string }) =>
    api.get('/analytics/fees/classes', { params }),
  getFeeOutstanding: (params?: { academic_year_id?: number; standard?: string; limit?: number }) =>
    api.get('/analytics/fees/outstanding', { params }),
  getPaymentModes: (params?: { academic_year_id?: number }) =>
    api.get('/analytics/fees/payment-modes', { params }),

  // Academic analytics
  getAcademic: (params?: { academic_year_id?: number; standard?: string; exam_type_id?: number }) =>
    api.get('/analytics/academic', { params }),

  // Class analytics
  getClasses: (params?: { academic_year_id?: number; standard?: string; division?: string }) =>
    api.get('/analytics/classes', { params }),

  // Teacher/staff analytics
  getTeachers: (params?: { academic_year_id?: number }) =>
    api.get('/analytics/teachers', { params }),

  // Risk indicators
  getRisk: (params?: { academic_year_id?: number; standard?: string }) =>
    api.get('/analytics/risk', { params }),

  // NLG insights
  getInsights: (params?: { academic_year_id?: number }) =>
    api.get('/analytics/insights', { params }),

  // Library
  getLibrary: () => api.get('/analytics/library'),

  // Inventory
  getInventory: () => api.get('/analytics/inventory'),

  // Additional legacy endpoints
  getExamPerformance: (params?: Record<string, any>) =>
    api.get('/analytics/academic', { params }),
  getEnrollmentStats: (params?: Record<string, any>) =>
    api.get('/analytics/students', { params }),
  exportReport: (type: string, params?: Record<string, any>) =>
    api.get(`/analytics/export/${type}`, { params, responseType: 'blob' }),
};

// ─────────────────────────────────────────────────────────
// SETTINGS API
// ─────────────────────────────────────────────────────────
export const settingsAPI = {
  getSchoolInfo: () => api.get('/settings/school'),
  updateSchoolInfo: (data: object) => api.patch('/settings/school', data),
  getAcademicYears: () => api.get('/settings/academic-years'),
  createAcademicYear: (data: object) => api.post('/settings/academic-years', data),
  setCurrentYear: (id: number) => api.patch(`/settings/academic-years/${id}/set-current`),
  getClasses: () => api.get('/settings/classes'),
  createClass: (data: object) => api.post('/settings/classes', data),
  updateClass: (id: number, data: object) =>
    api.patch(`/settings/classes/${id}`, data),
  deleteClass: (id: number) => api.delete(`/settings/classes/${id}`),
  getSubjects: (params?: Record<string, any>) =>
    api.get('/settings/subjects', { params }),
  createSubject: (data: object) => api.post('/settings/subjects', data),
  updateSubject: (id: number, data: object) =>
    api.patch(`/settings/subjects/${id}`, data),
  deleteSubject: (id: number) => api.delete(`/settings/subjects/${id}`),
};

// ─────────────────────────────────────────────────────────
// USERS ADMIN API
// ─────────────────────────────────────────────────────────
export const usersAPI = {
  list: (params?: Record<string, any>) => api.get('/admin/users', { params }),
  get: (id: number) => api.get(`/admin/users/${id}`),
  create: (data: object) => api.post('/admin/users', data),
  update: (id: number, data: object) => api.patch(`/admin/users/${id}`, data),
  deactivate: (id: number) => api.patch(`/admin/users/${id}/deactivate`),
  activate: (id: number) => api.patch(`/admin/users/${id}/activate`),
  resetPassword: (id: number, data: object) =>
    api.post(`/admin/users/${id}/reset-password`, data),
  getRoles: () => api.get('/admin/roles'),
};

// ─────────────────────────────────────────────────────────
// ROLES & PERMISSIONS API
// ─────────────────────────────────────────────────────────
export const rolesAPI = {
  list: () => api.get('/admin/roles'),
  get: (id: number) => api.get(`/admin/roles/${id}`),
  create: (data: object) => api.post('/admin/roles', data),
  update: (id: number, data: object) => api.patch(`/admin/roles/${id}`, data),
  delete: (id: number) => api.delete(`/admin/roles/${id}`),
  getPermissions: () => api.get('/admin/permissions'),
  assignPermissions: (roleId: number, permissions: string[]) =>
    api.post(`/admin/roles/${roleId}/permissions`, { permissions }),
};

// ─────────────────────────────────────────────────────────
// AUDIT LOG API
// ─────────────────────────────────────────────────────────
export const auditAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/admin/audit-logs', { params }),
  get: (id: number) => api.get(`/admin/audit-logs/${id}`),
  getActions: () => api.get('/admin/audit-logs/actions'),
  export: (params?: Record<string, any>) =>
    api.get('/admin/audit-logs/export', { params, responseType: 'blob' }),
};

// ─────────────────────────────────────────────────────────
// TEACHERS API
// ─────────────────────────────────────────────────────────
export const teachersAPI = {
  list: (params?: Record<string, any>) => api.get('/teachers', { params }),
  get: (id: number) => api.get(`/teachers/${id}`),
  create: (data: object) => api.post('/teachers', data),
  update: (id: number, data: object) => api.patch(`/teachers/${id}`, data),
  delete: (id: number) => api.delete(`/teachers/${id}`),
  getMyProfile: () => api.get('/teachers/my-profile'),
  getSubjectAssignments: (params?: Record<string, any>) =>
    api.get('/teachers/subject-assignments', { params }),
};

// ─────────────────────────────────────────────────────────
// ACADEMICS / SUBJECTS API
// ─────────────────────────────────────────────────────────
export const academicsAPI = {
  getSubjectAssignments: (params?: Record<string, any>) =>
    api.get('/academics/subject-assignments', { params }),
  createAssignment: (data: object) =>
    api.post('/academics/subject-assignments', data),
  updateAssignment: (id: number, data: object) =>
    api.patch(`/academics/subject-assignments/${id}`, data),
  deleteAssignment: (id: number) =>
    api.delete(`/academics/subject-assignments/${id}`),
  getSubjects: (params?: Record<string, any>) =>
    api.get('/academics/subjects', { params }),
  getClasses: () => api.get('/academics/classes'),
};

// ─────────────────────────────────────────────────────────
// SEARCH API
// ─────────────────────────────────────────────────────────
export const searchAPI = {
  globalSearch: (query: string, params?: Record<string, any>) =>
    api.get('/search', { params: { q: query, ...params } }),
  searchStudents: (query: string, params?: Record<string, any>) =>
    api.get('/students', { params: { search: query, ...params } }),
  searchTeachers: (query: string) =>
    api.get('/teachers', { params: { search: query } }),
  searchBooks: (query: string) =>
    api.get('/library/books', { params: { search: query } }),
};

// ─────────────────────────────────────────────────────────
// NOTIFICATION API
// ─────────────────────────────────────────────────────────
export const notificationAPI = {
  list: (params?: Record<string, any>) =>
    api.get('/notifications', { params }),
  markRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// ─────────────────────────────────────────────────────────
// PROFILE API
// ─────────────────────────────────────────────────────────
export const profileAPI = {
  getMyProfile: () => api.get('/auth/me'),
  updateProfile: (data: object) => api.patch('/auth/profile', data),
  uploadPhoto: (formData: FormData) =>
    api.post('/auth/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
};

// ─────────────────────────────────────────────────────────
// QR API
// ─────────────────────────────────────────────────────────
export const qrAPI = {
  scanAttendance: (data: object) => api.post('/qr/attendance', data),
  scanLibrary: (data: object) => api.post('/qr/library', data),
  generateStudentQR: (studentId: number) =>
    api.get(`/qr/student/${studentId}`),
};

// ─────────────────────────────────────────────────────────
// DASHBOARD / ANALYTICS API (legacy compat)
// ─────────────────────────────────────────────────────────
export const dashboardAPI = {
  getSummary: (academic_year: string) =>
    api.get('/analytics/summary', { params: { academic_year } }),
};

// ─────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/health'),
};

// ─────────────────────────────────────────────────────────
// OFFICE API
// ─────────────────────────────────────────────────────────
export const officeAPI = {
  getNotices: (params?: Record<string, any>) =>
    api.get('/office/notices', { params }),
  createNotice: (data: object) => api.post('/office/notices', data),
  updateNotice: (id: number, data: object) =>
    api.patch(`/office/notices/${id}`, data),
  deleteNotice: (id: number) => api.delete(`/office/notices/${id}`),
  getCirculars: (params?: Record<string, any>) =>
    api.get('/office/circulars', { params }),
};

// ─────────────────────────────────────────────────────────
// PARENT PORTAL API
// ─────────────────────────────────────────────────────────
export const parentAPI = {
  getMyChildren: () => api.get('/parent-portal/children'),
  getChildProfile: (childId: number) =>
    api.get(`/parent-portal/children/${childId}`),
  getChildAttendance: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent-portal/children/${childId}/attendance`, { params }),
  getChildFees: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent-portal/children/${childId}/fees`, { params }),
  getChildResults: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent-portal/children/${childId}/results`, { params }),
  getChildHomework: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent-portal/children/${childId}/homework`, { params }),
  getChildTimetable: (childId: number) =>
    api.get(`/parent-portal/children/${childId}/timetable`),
  applyLeaveForChild: (childId: number, data: object) =>
    api.post(`/parent-portal/children/${childId}/leave`, data),
};

// ─────────────────────────────────────────────────────────
// STUDENT PORTAL API
// ─────────────────────────────────────────────────────────
export const studentPortalAPI = {
  getProfile: () => api.get('/student-portal/me'),
  getDashboard: () => api.get('/student-portal/dashboard'),
  getMyTimetable: () => api.get('/student-portal/timetable'),
  getMyAttendance: (params?: Record<string, any>) =>
    api.get('/student-portal/attendance', { params }),
  getMyResults: (params?: Record<string, any>) =>
    api.get('/student-portal/results', { params }),
  getMyFees: (params?: Record<string, any>) =>
    api.get('/student-portal/fees', { params }),
  getMyHomework: (params?: Record<string, any>) =>
    api.get('/student-portal/homework', { params }),
  submitHomework: (hwId: number, data: object) =>
    api.post(`/student-portal/homework/${hwId}/submit`, data),
  getMyLeave: (params?: Record<string, any>) =>
    api.get('/student-portal/leave', { params }),
  applyLeave: (data: object) => api.post('/student-portal/leave/apply', data),
  getExamSchedule: () => api.get('/student-portal/exam-schedule'),
  getIdCard: () => api.get('/student-portal/id-card'),
  getNotices: () => api.get('/student-portal/notices'),
};

// ─────────────────────────────────────────────────────────
// TEACHER PORTAL API
// ─────────────────────────────────────────────────────────
export const teacherPortalAPI = {
  getProfile: () => api.get('/teacher-portal/me'),
  getDashboard: () => api.get('/teacher-portal/dashboard'),
  getMyClasses: () => api.get('/teacher-portal/classes'),
  getMyTimetable: () => api.get('/teacher-portal/timetable'),
  getMyStudents: (params?: Record<string, any>) =>
    api.get('/teacher-portal/students', { params }),
  getMySubjects: () => api.get('/teacher-portal/subjects'),
  getMyLeave: (params?: Record<string, any>) =>
    api.get('/teacher-portal/leave', { params }),
};

// ─────────────────────────────────────────────────────────
// FCM PUSH NOTIFICATION API
// ─────────────────────────────────────────────────────────
export const fcmAPI = {
  /** Register or update the FCM device token (call after login) */
  registerToken: (data: {
    fcm_token: string;
    device_type: 'android' | 'ios' | 'web';
    platform?: string;
    browser?: string;
    os?: string;
    device_name?: string;
  }) => api.post('/fcm/register', data),

  /** Remove token on logout */
  unregisterToken: (fcm_token: string) =>
    api.delete('/fcm/unregister', { data: { fcm_token } }),

  /** Remove ALL tokens for current user (logout-all) */
  unregisterAllTokens: () => api.delete('/fcm/unregister-all'),

  /** List current user's registered devices */
  getMyDevices: () => api.get('/fcm/tokens'),

  // ── Admin send endpoints ──────────────────────────────
  /** Admin: send to a single user */
  sendToUser: (userId: number, payload: {
    title: string; body: string; data?: Record<string, any>; image_url?: string;
  }) => api.post(`/fcm/send/user/${userId}`, payload),

  /** Admin: send to multiple users */
  sendToUsers: (payload: {
    user_ids: number[]; title: string; body: string; data?: Record<string, any>; image_url?: string;
  }) => api.post('/fcm/send/users', payload),

  /** Admin: broadcast to all devices */
  broadcast: (payload: {
    title: string; body: string; data?: Record<string, any>; image_url?: string;
  }) => api.post('/fcm/send/broadcast', payload),

  /** Admin: send by role code */
  sendToRole: (roleCode: string, payload: {
    title: string; body: string; data?: Record<string, any>; image_url?: string;
  }) => api.post(`/fcm/send/role/${roleCode}`, payload),

  /** Admin: send to FCM topic */
  sendToTopic: (topic: string, payload: {
    title: string; body: string; data?: Record<string, any>; image_url?: string;
  }) => api.post(`/fcm/send/topic/${topic}`, payload),

  /** Admin: send to a class */
  sendToClass: (classId: number, payload: {
    title: string; body: string; data?: Record<string, any>; image_url?: string;
  }) => api.post(`/fcm/send/class/${classId}`, payload),

  /** Admin: get notification delivery history */
  getLogs: (params?: {
    limit?: number; offset?: number; user_id?: number; delivery_status?: string;
  }) => api.get('/fcm/logs', { params }),

  /** Admin: list all registered devices */
  getAllDevices: (params?: {
    limit?: number; offset?: number; user_id?: number; device_type?: string;
  }) => api.get('/fcm/admin/devices', { params }),
};


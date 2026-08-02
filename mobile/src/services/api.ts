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
  ACCESS_TOKEN:  'vs_access_token',
  REFRESH_TOKEN: 'vs_refresh_token',
  USER:          'vs_user',
  LANGUAGE:      'vs_language',
  THEME:         'vs_theme',
};

// ── Base URLs ────────────────────────────────────────────
// Priority 1: Local machine backend (dev only)
let LOCAL_BASE_URL  = 'http://localhost:8000/api/v1';
const EMULATOR_BASE_URL = 'http://10.0.2.2:8000/api/v1';
// Priority 2: Replit cloud backend (always available fallback)
const REPLIT_BASE_URL = 'https://vidya-setu--pankajyewale111.replit.app/api/v1';
// Production URL (used in release builds)
const PROD_BASE_URL   = REPLIT_BASE_URL;

/**
 * Start with local backend in DEV mode.
 * The response interceptor automatically falls back
 * to the Replit backend when local is unreachable.
 */
const INITIAL_BASE_URL = __DEV__ ? LOCAL_BASE_URL : PROD_BASE_URL;

// Track which backend is currently active
let activeBaseURL = INITIAL_BASE_URL;
let usingFallback  = false;
let fallbackCheckInProgress = false;

/** Silently probe local backend; returns true if reachable */
async function isLocalReachable(): Promise<boolean> {
  // Try localhost:8000 first (works on iOS, Web, and Android with ADB reverse)
  try {
    const res = await axios.get(`${LOCAL_BASE_URL}/health`, { timeout: 2500 });
    if (res.data?.status === 'healthy' || res.status === 200) {
      setBaseURL(LOCAL_BASE_URL);
      return true;
    }
  } catch {
    /* try emulator IP */
  }

  // Try 10.0.2.2:8000 (Android Emulator fallback)
  if (Platform.OS === 'android') {
    try {
      const res = await axios.get(`${EMULATOR_BASE_URL}/health`, { timeout: 2500 });
      if (res.data?.status === 'healthy' || res.status === 200) {
        LOCAL_BASE_URL = EMULATOR_BASE_URL;
        setBaseURL(EMULATOR_BASE_URL);
        return true;
      }
    } catch {
      /* both failed */
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
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * On first load in DEV mode, check if local backend is alive.
 * If not, switch immediately to Replit.
 */
if (__DEV__) {
  isLocalReachable().then(reachable => {
    if (!reachable && !usingFallback) {
      usingFallback = true;
      setBaseURL(REPLIT_BASE_URL);
      console.log(
        '[API] Local backend unreachable. Using Replit fallback:',
        REPLIT_BASE_URL,
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
    // ── Auto-fallback: if local backend drops mid-session, switch to Replit ──
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
        setBaseURL(REPLIT_BASE_URL);
        console.log('[API] Local went offline mid-session → switched to Replit:', REPLIT_BASE_URL);

        // Retry the failed request with the new URL
        const retryConfig = error.config as any;
        if (retryConfig && !retryConfig._fallbackRetry) {
          retryConfig._fallbackRetry = true;
          retryConfig.baseURL = REPLIT_BASE_URL;
          retryConfig.url = retryConfig.url?.replace(LOCAL_BASE_URL, '') ?? retryConfig.url;
          return api(retryConfig);
        }
      }
    }

    // ── Also try recovering: if on Replit fallback and local comes back ──
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
        ? 'Request timed out. Make sure the server is running.'
        : `Cannot connect to server.\nLocal: ${LOCAL_BASE_URL}\nFallback: ${REPLIT_BASE_URL}`;
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
          const res = await axios.post(`${activeBaseURL}/auth/refresh`, { refresh_token: refreshToken });
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
  getClassAttendance: (standard: string, division: string, date: string) =>
    api.get('/attendance/class', { params: { standard, division, date } }),
  markAttendance: (records: object[]) =>
    api.post('/attendance/mark', { records }),
  getStudentSummary: (studentId: number, academic_year: string) =>
    api.get(`/attendance/student/${studentId}/summary`, { params: { academic_year } }),
  getMonthlyReport: (standard: string, division: string, month: string, year: string) =>
    api.get('/attendance/monthly-report', { params: { standard, division, month, year } }),
  getMyAttendance: (params?: Record<string, any>) =>
    api.get('/attendance/my-attendance', { params }),
  getClassesList: () => api.get('/attendance/classes'),
  updateRecord: (recordId: number, data: object) =>
    api.patch(`/attendance/${recordId}`, data),
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
// ANALYTICS API
// ─────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSummary: (params?: Record<string, any>) =>
    api.get('/analytics/summary', { params }),
  getAttendanceTrend: (params?: Record<string, any>) =>
    api.get('/analytics/attendance-trend', { params }),
  getFinanceTrend: (params?: Record<string, any>) =>
    api.get('/analytics/finance-trend', { params }),
  getExamPerformance: (params?: Record<string, any>) =>
    api.get('/analytics/exam-performance', { params }),
  getEnrollmentStats: (params?: Record<string, any>) =>
    api.get('/analytics/enrollment', { params }),
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
  getMyChildren: () => api.get('/parent/children'),
  getChildProfile: (childId: number) =>
    api.get(`/parent/children/${childId}`),
  getChildAttendance: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent/children/${childId}/attendance`, { params }),
  getChildFees: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent/children/${childId}/fees`, { params }),
  getChildResults: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent/children/${childId}/results`, { params }),
  getChildHomework: (childId: number, params?: Record<string, any>) =>
    api.get(`/parent/children/${childId}/homework`, { params }),
  getChildTimetable: (childId: number) =>
    api.get(`/parent/children/${childId}/timetable`),
  applyLeaveForChild: (childId: number, data: object) =>
    api.post(`/parent/children/${childId}/leave`, data),
};

// ─────────────────────────────────────────────────────────
// STUDENT PORTAL API
// ─────────────────────────────────────────────────────────
export const studentPortalAPI = {
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
};

// ─────────────────────────────────────────────────────────
// TEACHER PORTAL API
// ─────────────────────────────────────────────────────────
export const teacherPortalAPI = {
  getDashboard: () => api.get('/teacher-portal/dashboard'),
  getMyClasses: () => api.get('/teacher-portal/classes'),
  getMyTimetable: () => api.get('/teacher-portal/timetable'),
  getMyStudents: (params?: Record<string, any>) =>
    api.get('/teacher-portal/students', { params }),
  getMySubjects: () => api.get('/teacher-portal/subjects'),
  getMyLeave: (params?: Record<string, any>) =>
    api.get('/teacher-portal/leave', { params }),
};

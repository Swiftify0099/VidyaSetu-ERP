/**
 * VidyaSetu Mobile — Centralized API Error Parser & Sanitizer
 * ============================================================
 * Extracts meaningful backend messages, categorizes error types,
 * sanitizes internal traces, and provides safe user-facing feedback
 * alongside developer debug details in DEV mode.
 */
import { AxiosError } from 'axios';

export type ErrorCategory =
  | 'network'
  | 'auth'
  | 'permission'
  | 'notFound'
  | 'validation'
  | 'server'
  | 'timeout'
  | 'unknown';

export interface AppErrorInfo {
  title: string;
  message: string;
  category: ErrorCategory;
  statusCode?: number;
  endpoint?: string;
  method?: string;
  fieldErrors?: Record<string, string>;
  isRetryable: boolean;
  debugDetails?: {
    originalMessage: string;
    statusCode?: number;
    endpoint?: string;
    method?: string;
    timestamp: string;
    rawDetail?: any;
  };
}

/** Sanitizes a string by stripping stack traces, SQL errors, and file paths */
function sanitizeMessage(msg: string): string {
  if (!msg) return '';

  // Remove file paths (e.g. /app/backend/..., C:\Users\...)
  let sanitized = msg.replace(/(?:\/[a-zA-Z0-9_.\-]+)+/g, '[path]');
  sanitized = sanitized.replace(/[a-zA-Z]:\\[a-zA-Z0-9_.\\\-]+/g, '[path]');

  // Remove common DB / ORM keywords if present
  sanitized = sanitized.replace(/Traceback \(most recent call last\):[\s\S]*/gi, '');
  sanitized = sanitized.replace(/sqlalchemy\.exc\.[a-zA-Z0-9_]+/gi, 'Database Error');
  sanitized = sanitized.replace(/psycopg2\.[a-zA-Z0-9_]+/gi, 'Database Error');

  return sanitized.trim();
}

/** Central parser for all API and runtime errors */
export function parseApiError(error: any, fallbackTitle = 'Unable to Complete Request'): AppErrorInfo {
  const timestamp = new Date().toISOString();

  // Handle network / timeout errors
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return {
        title: 'Connection Timed Out',
        message: 'The server took too long to respond. Please check your internet and try again.',
        category: 'timeout',
        isRetryable: true,
        debugDetails: {
          originalMessage: error?.message || 'ECONNABORTED',
          timestamp,
        },
      };
    }

    if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
      return {
        title: 'No Internet Connection',
        message: 'Unable to connect to the VidyaSetu server. Please verify your internet connectivity.',
        category: 'network',
        isRetryable: true,
        debugDetails: {
          originalMessage: error?.message || 'Network Error',
          timestamp,
        },
      };
    }
  }

  const axiosErr = error as AxiosError<any>;
  const status = axiosErr.response?.status;
  const data = axiosErr.response?.data;
  const endpoint = axiosErr.config?.url;
  const method = axiosErr.config?.method?.toUpperCase();

  // Extract raw backend message/detail
  let rawMsg = '';
  const fieldErrors: Record<string, string> = {};

  if (typeof data === 'string') {
    rawMsg = data;
  } else if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') {
      rawMsg = data.detail;
    } else if (Array.isArray(data.detail)) {
      // FastAPI / Pydantic 422 validation errors array
      rawMsg = data.detail.map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : 'field';
        const msg = d.msg || 'Invalid value';
        if (field && typeof field === 'string') {
          fieldErrors[field] = msg;
        }
        return `${field}: ${msg}`;
      }).join(', ');
    } else if (data.message && typeof data.message === 'string') {
      rawMsg = data.message;
    } else if (data.error && typeof data.error === 'string') {
      rawMsg = data.error;
    }
  }

  if (!rawMsg && axiosErr.message) {
    rawMsg = axiosErr.message;
  }

  const cleanMessage = sanitizeMessage(rawMsg);

  // Categorize by HTTP status code
  switch (status) {
    case 400:
      return {
        title: fallbackTitle || 'Invalid Request',
        message: cleanMessage || 'The request could not be processed due to invalid parameters.',
        category: 'validation',
        statusCode: 400,
        endpoint,
        method,
        fieldErrors,
        isRetryable: false,
        debugDetails: { originalMessage: rawMsg, statusCode: 400, endpoint, method, timestamp, rawDetail: data },
      };

    case 401:
      return {
        title: 'Session Expired',
        message: cleanMessage || 'Your session has timed out or is invalid. Please sign in again.',
        category: 'auth',
        statusCode: 401,
        endpoint,
        method,
        isRetryable: false,
        debugDetails: { originalMessage: rawMsg, statusCode: 401, endpoint, method, timestamp, rawDetail: data },
      };

    case 403:
      return {
        title: 'Permission Denied',
        message: cleanMessage || 'You do not have administrative permissions to view or perform this action.',
        category: 'permission',
        statusCode: 403,
        endpoint,
        method,
        isRetryable: false,
        debugDetails: { originalMessage: rawMsg, statusCode: 403, endpoint, method, timestamp, rawDetail: data },
      };

    case 404:
      return {
        title: 'Record Not Found',
        message: cleanMessage || 'The requested record or resource was not found on the server.',
        category: 'notFound',
        statusCode: 404,
        endpoint,
        method,
        isRetryable: true,
        debugDetails: { originalMessage: rawMsg, statusCode: 404, endpoint, method, timestamp, rawDetail: data },
      };

    case 422:
      return {
        title: 'Validation Error',
        message: cleanMessage || 'One or more fields contain invalid data. Please review and try again.',
        category: 'validation',
        statusCode: 422,
        endpoint,
        method,
        fieldErrors,
        isRetryable: false,
        debugDetails: { originalMessage: rawMsg, statusCode: 422, endpoint, method, timestamp, rawDetail: data },
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        title: 'Server Error',
        message: cleanMessage || 'The server encountered an unexpected condition. Please try again in a few moments.',
        category: 'server',
        statusCode: status,
        endpoint,
        method,
        isRetryable: true,
        debugDetails: { originalMessage: rawMsg, statusCode: status, endpoint, method, timestamp, rawDetail: data },
      };

    default:
      return {
        title: fallbackTitle,
        message: cleanMessage || 'An unexpected error occurred while processing your request.',
        category: 'unknown',
        statusCode: status,
        endpoint,
        method,
        fieldErrors,
        isRetryable: true,
        debugDetails: { originalMessage: rawMsg, statusCode: status, endpoint, method, timestamp, rawDetail: data },
      };
  }
}

/** Quick user-friendly error string extractor */
export function getCleanErrorMessage(error: any, fallback = 'Something went wrong'): string {
  const parsed = parseApiError(error);
  return parsed.message || fallback;
}

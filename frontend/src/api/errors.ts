import axios from 'axios';
import { ElMessage } from 'element-plus';

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as { error?: unknown; details?: unknown } | undefined;
    const message = typeof payload?.error === 'string' ? payload.error : error.message || fallback;
    return new ApiError(message, error.response?.status, payload?.details);
  }
  if (error instanceof Error) return new ApiError(error.message || fallback);
  return new ApiError(fallback);
}

export function showApiError(error: unknown, fallback: string) {
  ElMessage.error(normalizeApiError(error, fallback).message);
}

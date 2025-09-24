/**
 * Error-related type definitions
 */

import { ErrorCode } from "@/lib/errors/errorCodes";

// Re-export error code for convenience
export { ErrorCode };

// Error response types
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    version: string;
    [key: string]: any;
  };
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationErrors {
  [field: string]: string[];
}

// Service error types
export interface ServiceError {
  service: string;
  operation: string;
  error: string;
  retryable: boolean;
  retryAfter?: number;
}

// External API error types
export interface ExternalAPIError {
  service: "github" | "judge0" | "gemini" | "razorpay" | "supabase";
  endpoint: string;
  statusCode?: number;
  response?: any;
  retryable: boolean;
}

// Database error types
export interface DatabaseError {
  operation: "select" | "insert" | "update" | "delete";
  table: string;
  error: string;
  code?: string;
  details?: any;
}

// Authentication error types
export interface AuthError {
  provider: "github" | "nextauth";
  operation: "signin" | "token_validation" | "session";
  error: string;
  details?: any;
}

// Payment error types
export interface PaymentError {
  provider: "razorpay";
  operation: "create_order" | "verify_payment";
  orderId?: string;
  paymentId?: string;
  error: string;
  details?: any;
}

// File operation error types
export interface FileError {
  operation: "read" | "write" | "upload" | "download";
  path: string;
  error: string;
  size?: number;
  type?: string;
}

// Code execution error types
export interface CodeExecutionError {
  language: string;
  operation: "compile" | "execute" | "test";
  error: string;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
}

// Rate limit error types
export interface RateLimitError {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

// Error context for logging
export interface ErrorContext {
  userId?: string;
  requestId: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
  url: string;
  method: string;
  processingTime?: number;
}

// Comprehensive error interface
export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  isOperational: boolean;
  context?: ErrorContext;
  details?: any;
  cause?: Error;
}

// Error factory functions type
export type ErrorFactory<T extends Record<string, any> = Record<string, any>> =
  (details?: T) => AppError;

// Error handler result
export interface ErrorHandlerResult {
  error: AppError;
  shouldLog: boolean;
  shouldReport: boolean;
  userMessage: string;
  retryable: boolean;
}

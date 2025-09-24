/**
 * Middleware-related type definitions
 */

import { NextRequest, NextResponse } from "next/server";
import { User, RequestContext } from "./api";

// Base middleware function type
export type MiddlewareFunction = (
  req: NextRequest,
  context: RequestContext,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

// Higher-order component for route handlers with middleware
export type WithMiddleware<T extends any[] = []> = (
  handler: (...args: T) => Promise<NextResponse>,
  ...middleware: MiddlewareFunction[]
) => (...args: T) => Promise<NextResponse>;

// Authentication middleware types
export interface AuthMiddlewareOptions {
  required: boolean;
  redirectTo?: string;
  publicPaths?: string[];
}

export interface AuthResult {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
}

// Credit middleware types
export interface CreditMiddlewareOptions {
  cost: number;
  feature: string;
  skipCheck?: boolean;
  allowNegative?: boolean;
}

export interface CreditCheckResult {
  allowed: boolean;
  available: number;
  required: number;
  shortfall?: number;
  transactionId?: string;
}

// Validation middleware types
export interface ValidationRule {
  field: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  customValidator?: (value: any, req: NextRequest) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  validatedData?: any;
}

// Rate limiting middleware types
export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
}

// CORS middleware types
export interface CORSOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

// Logging middleware types
export interface LoggingOptions {
  level?: "debug" | "info" | "warn" | "error";
  includeHeaders?: boolean;
  includeBody?: boolean;
  excludePaths?: string[];
  maskFields?: string[];
}

export interface LogEntry {
  timestamp: string;
  level: string;
  method: string;
  url: string;
  statusCode?: number;
  userId?: string;
  requestId: string;
  userAgent?: string;
  ip?: string;
  processingTime?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// Error handling middleware types
export interface ErrorHandlingOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  reportErrors?: boolean;
  trustedErrorCodes?: string[];
}

// Response middleware types
export interface ResponseOptions {
  includeRequestId?: boolean;
  includeProcessingTime?: boolean;
  includeVersion?: boolean;
  compress?: boolean;
}

// Middleware chain types
export type MiddlewareChain = MiddlewareFunction[];

export interface MiddlewareConfig {
  auth?: AuthMiddlewareOptions;
  credits?: CreditMiddlewareOptions;
  validation?: ValidationSchema;
  rateLimit?: RateLimitOptions;
  cors?: CORSOptions;
  logging?: LoggingOptions;
  errorHandling?: ErrorHandlingOptions;
  response?: ResponseOptions;
}

// Route handler with middleware support
export type RouteHandler<T = any> = (
  req: NextRequest,
  context: RequestContext,
) => Promise<NextResponse<T>>;

export type RouteHandlerWithMiddleware<T = any> = (
  req: NextRequest,
  context: RequestContext & { config: MiddlewareConfig },
) => Promise<NextResponse<T>>;

// Middleware registry
export interface MiddlewareRegistry {
  register: (name: string, middleware: MiddlewareFunction) => void;
  get: (name: string) => MiddlewareFunction | undefined;
  apply: (names: string[], handler: RouteHandler) => RouteHandler;
}

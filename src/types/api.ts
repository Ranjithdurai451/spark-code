/**
 * Shared TypeScript types for API requests, responses, and common interfaces
 */

// User types
export interface User {
  id: string;
  login: string;
  email: string;
  name?: string;
  avatar_url?: string;
  credits: number;
  total_credits_earned: number;
  total_credits_spent: number;
  created_at: string;
  last_login_at?: string;
}

// Request context for middleware
export interface RequestContext {
  user: User;
  startTime: number;
  requestId: string;
  userAgent?: string;
  ip?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Common API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    requestId: string;
    processingTime?: number;
    version: string;
    [key: string]: any;
  };
}

// Validation types
export interface ValidationRule {
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  customValidator?: (value: any, req?: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// Credit system types
export interface CreditTransaction {
  id: string;
  user_id: string;
  type: "purchase" | "usage" | "refund" | "bonus";
  amount: number;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreditCheckResult {
  allowed: boolean;
  available: number;
  required: number;
  shortfall?: number;
}

// Code execution types
export interface CodeExecutionRequest {
  code: string;
  language: string;
  input?: string;
  testCase?: {
    input: any[];
    output: any;
  };
}

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage: number;
  status: string;
  exitCode?: number;
}

// GitHub integration types
export interface GitHubFileRequest {
  repo: string;
  path: string;
}

export interface GitHubFileResponse {
  success: boolean;
  content: string;
  name: string;
  path: string;
  size: number;
  sha: string;
  url?: string;
}

export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url?: string;
}

// Payment types
export interface PaymentOrderRequest {
  planId: string;
  amount: number;
  credits: number;
}

export interface PaymentOrderResponse {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
}

// Plan types
export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  credits: number;
  active: boolean;
  features?: string[];
  created_at: string;
  updated_at: string;
}

// Chatbot types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export interface ChatbotRequest {
  messages: ChatMessage[];
  currentTab?: {
    name: string;
    language: string;
    code: string;
  };
}

// Analysis types
export interface CodeAnalysisRequest {
  code: string;
  language?: string;
  messages?: ChatMessage[];
}

export interface CodeAnalysisResult {
  functionName?: string;
  language: string;
  algorithmPattern?: string;
  quality: {
    score: number;
    level: string;
  };
  analysis: string;
}

// Test generation types
export interface TestCase {
  input: any[];
  output: any;
}

export interface TestGenerationRequest {
  code: string;
  language?: string;
  messages?: ChatMessage[];
}

export interface TestGenerationResult {
  testCases: TestCase[];
  functionName?: string;
  language: string;
  algorithmPattern?: string;
}

// Documentation types
export interface DocumentationRequest {
  code: string;
  language?: string;
  messages?: ChatMessage[];
}

export interface DocumentationResult {
  documentation: string;
  functionName?: string;
  language: string;
  algorithmPattern?: string;
}

// Common error types
export interface APIError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

// Middleware types
export type RouteHandler = (
  req: Request,
  context: RequestContext,
) => Promise<Response> | Response;

export type MiddlewareHandler = (
  req: Request,
  context: RequestContext,
  next: RouteHandler,
) => Promise<Response> | Response;

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Keys>>;
  }[Keys];

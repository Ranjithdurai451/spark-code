import { NextResponse } from "next/server";
import { ErrorCode, ERROR_MESSAGES, HTTP_STATUS_MAP } from "./errorCodes";

/**
 * Custom API Error class for standardized error handling
 */
export class APIError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    details?: any,
    isOperational: boolean = true,
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = "APIError";
    this.code = code;
    this.statusCode = HTTP_STATUS_MAP[code];
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a new APIError instance
   */
  static create(
    code: ErrorCode,
    details?: any,
    customMessage?: string,
  ): APIError {
    return new APIError(code, customMessage, details);
  }
}

/**
 * Convert various error types to standardized APIError
 */
export function handleAPIError(error: any): APIError {
  // Already an APIError
  if (error instanceof APIError) {
    return error;
  }

  // Handle known external error patterns
  if (error?.code === "PGRST116" || error?.message?.includes("not found")) {
    return APIError.create(ErrorCode.RESOURCE_NOT_FOUND, {
      originalError: error.message,
    });
  }

  if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
    return APIError.create(ErrorCode.RESOURCE_ALREADY_EXISTS, {
      originalError: error.message,
    });
  }

  if (error?.code === "PGRST301" || error?.message?.includes("JWT")) {
    return APIError.create(ErrorCode.UNAUTHENTICATED, {
      originalError: error.message,
    });
  }

  // Handle fetch/network errors
  if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
    return APIError.create(ErrorCode.EXTERNAL_API_ERROR, {
      originalError: error.message,
    });
  }

  // Handle timeout errors
  if (error?.name === "AbortError" || error?.message?.includes("timeout")) {
    return APIError.create(ErrorCode.EXECUTION_TIMEOUT, {
      originalError: error.message,
    });
  }

  // Handle validation errors (e.g., from Zod or similar)
  if (error?.name === "ZodError") {
    return APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: error.errors },
      "Request validation failed",
    );
  }

  // Handle rate limiting
  if (error?.status === 429 || error?.message?.includes("rate limit")) {
    return APIError.create(ErrorCode.RATE_LIMIT_EXCEEDED, {
      originalError: error.message,
    });
  }

  // Handle GitHub API errors
  if (
    error?.message?.includes("GitHub") ||
    (error?.status >= 400 && error?.status < 500)
  ) {
    if (error.status === 401) {
      return APIError.create(ErrorCode.UNAUTHENTICATED, {
        originalError: error.message,
      });
    }
    if (error.status === 403) {
      return APIError.create(ErrorCode.UNAUTHORIZED, {
        originalError: error.message,
      });
    }
    if (error.status === 404) {
      return APIError.create(ErrorCode.RESOURCE_NOT_FOUND, {
        originalError: error.message,
      });
    }
    return APIError.create(ErrorCode.GITHUB_API_ERROR, {
      originalError: error.message,
    });
  }

  // Handle payment errors
  if (
    error?.message?.includes("payment") ||
    error?.message?.includes("razorpay")
  ) {
    return APIError.create(ErrorCode.PAYMENT_ERROR, {
      originalError: error.message,
    });
  }

  // Handle Judge0/code execution errors
  if (
    error?.message?.includes("judge0") ||
    error?.message?.includes("execution")
  ) {
    return APIError.create(ErrorCode.JUDGE0_API_ERROR, {
      originalError: error.message,
    });
  }

  // Default to internal error for unknown errors
  return APIError.create(ErrorCode.INTERNAL_ERROR, {
    originalError: error?.message || "Unknown error",
    stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
  });
}

/**
 * Create error response for Next.js API routes
 */
export function createErrorResponse(
  error: APIError | any,
  metadata?: Record<string, any>,
): NextResponse {
  const apiError = error instanceof APIError ? error : handleAPIError(error);

  const responseBody = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(responseBody, {
    status: apiError.statusCode,
    headers: {
      "Content-Type": "application/json",
      "X-Error-Code": apiError.code,
    },
  });
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: any): boolean {
  if (error instanceof APIError) {
    return error.isOperational;
  }

  // Consider database connection errors as operational
  if (
    error?.code?.startsWith("PGRST") ||
    error?.message?.includes("connection")
  ) {
    return true;
  }

  // Consider network errors as operational
  if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
    return true;
  }

  // Default to programming error
  return false;
}

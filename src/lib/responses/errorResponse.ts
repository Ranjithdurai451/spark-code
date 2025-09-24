import { NextResponse } from "next/server";
import { APIError, handleAPIError } from "../errors/errorHandler";

/**
 * Create a standardized error response
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
      "X-Request-ID": responseBody.metadata.requestId,
    },
  });
}

/**
 * Create a validation error response with detailed field errors
 */
export function createValidationErrorResponse(
  errors: Record<string, string[]>,
  metadata?: Record<string, any>,
): NextResponse {
  const responseBody = {
    success: false,
    error: {
      code: "INVALID_REQUEST",
      message: "Request validation failed",
      details: {
        validationErrors: errors,
        fields: Object.keys(errors),
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(responseBody, {
    status: 400,
    headers: {
      "Content-Type": "application/json",
      "X-Error-Code": "INVALID_REQUEST",
      "X-Request-ID": responseBody.metadata.requestId,
    },
  });
}

/**
 * Create a rate limit error response
 */
export function createRateLimitResponse(
  retryAfter: number,
  metadata?: Record<string, any>,
): NextResponse {
  const responseBody = {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again later.",
      details: {
        retryAfter,
        retryAt: new Date(Date.now() + retryAfter * 1000).toISOString(),
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(responseBody, {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "X-Error-Code": "RATE_LIMIT_EXCEEDED",
      "X-Request-ID": responseBody.metadata.requestId,
      "Retry-After": retryAfter.toString(),
    },
  });
}

/**
 * Create a service unavailable response
 */
export function createServiceUnavailableResponse(
  service: string,
  retryAfter?: number,
  metadata?: Record<string, any>,
): NextResponse {
  const responseBody = {
    success: false,
    error: {
      code: "SERVICE_UNAVAILABLE",
      message: `${service} is temporarily unavailable. Please try again later.`,
      details: {
        service,
        retryAfter,
        retryAt: retryAfter
          ? new Date(Date.now() + retryAfter * 1000).toISOString()
          : undefined,
      },
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Error-Code": "SERVICE_UNAVAILABLE",
    "X-Request-ID": responseBody.metadata.requestId,
  };

  if (retryAfter) {
    headers["Retry-After"] = retryAfter.toString();
  }

  return NextResponse.json(responseBody, {
    status: 503,
    headers,
  });
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

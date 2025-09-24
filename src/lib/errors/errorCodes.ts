/**
 * Standardized error codes for the API
 * Each error code maps to a specific HTTP status and user-friendly message
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAUTHORIZED = "UNAUTHORIZED",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_TOKEN = "INVALID_TOKEN",

  // Validation
  INVALID_REQUEST = "INVALID_REQUEST",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT = "INVALID_FORMAT",
  INVALID_VALUE = "INVALID_VALUE",

  // Business Logic
  INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS",
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  OPERATION_FAILED = "OPERATION_FAILED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // External Services
  EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR",
  GITHUB_API_ERROR = "GITHUB_API_ERROR",
  PAYMENT_ERROR = "PAYMENT_ERROR",
  JUDGE0_API_ERROR = "JUDGE0_API_ERROR",

  // System
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // File Operations
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",

  // Code Execution
  COMPILATION_ERROR = "COMPILATION_ERROR",
  RUNTIME_ERROR = "RUNTIME_ERROR",
  EXECUTION_TIMEOUT = "EXECUTION_TIMEOUT",
  UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE",
}

/**
 * User-friendly error messages for each error code
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHENTICATED]:
    "Authentication required. Please sign in to continue.",
  [ErrorCode.UNAUTHORIZED]:
    "You do not have permission to perform this action.",
  [ErrorCode.TOKEN_EXPIRED]: "Your session has expired. Please sign in again.",
  [ErrorCode.INVALID_TOKEN]:
    "Invalid authentication token. Please sign in again.",

  [ErrorCode.INVALID_REQUEST]: "The request contains invalid data.",
  [ErrorCode.MISSING_REQUIRED_FIELD]: "Required field is missing.",
  [ErrorCode.INVALID_FORMAT]: "The provided data format is invalid.",
  [ErrorCode.INVALID_VALUE]: "The provided value is invalid.",

  [ErrorCode.INSUFFICIENT_CREDITS]:
    "Insufficient credits. Please purchase more credits to continue.",
  [ErrorCode.RESOURCE_NOT_FOUND]: "The requested resource was not found.",
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: "The resource already exists.",
  [ErrorCode.OPERATION_FAILED]: "The operation could not be completed.",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests. Please try again later.",

  [ErrorCode.EXTERNAL_API_ERROR]: "External service temporarily unavailable.",
  [ErrorCode.GITHUB_API_ERROR]: "GitHub service temporarily unavailable.",
  [ErrorCode.PAYMENT_ERROR]: "Payment processing failed.",
  [ErrorCode.JUDGE0_API_ERROR]:
    "Code execution service temporarily unavailable.",

  [ErrorCode.INTERNAL_ERROR]: "An internal error occurred. Please try again.",
  [ErrorCode.DATABASE_ERROR]: "Database temporarily unavailable.",
  [ErrorCode.CONFIGURATION_ERROR]: "Service configuration error.",
  [ErrorCode.SERVICE_UNAVAILABLE]: "Service temporarily unavailable.",

  [ErrorCode.FILE_TOO_LARGE]: "File size exceeds the maximum limit.",
  [ErrorCode.INVALID_FILE_TYPE]: "File type not supported.",
  [ErrorCode.FILE_NOT_FOUND]: "File not found.",

  [ErrorCode.COMPILATION_ERROR]: "Code compilation failed.",
  [ErrorCode.RUNTIME_ERROR]: "Code execution failed.",
  [ErrorCode.EXECUTION_TIMEOUT]: "Code execution timed out.",
  [ErrorCode.UNSUPPORTED_LANGUAGE]: "Programming language not supported.",
};

/**
 * HTTP status code mapping for each error code
 */
export const HTTP_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.UNAUTHORIZED]: 403,
  [ErrorCode.TOKEN_EXPIRED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,

  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.INVALID_VALUE]: 400,

  [ErrorCode.INSUFFICIENT_CREDITS]: 402, // Payment required
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.OPERATION_FAILED]: 422,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,

  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.GITHUB_API_ERROR]: 502,
  [ErrorCode.PAYMENT_ERROR]: 502,
  [ErrorCode.JUDGE0_API_ERROR]: 502,

  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.CONFIGURATION_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,

  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.INVALID_FILE_TYPE]: 415,
  [ErrorCode.FILE_NOT_FOUND]: 404,

  [ErrorCode.COMPILATION_ERROR]: 400,
  [ErrorCode.RUNTIME_ERROR]: 400,
  [ErrorCode.EXECUTION_TIMEOUT]: 408,
  [ErrorCode.UNSUPPORTED_LANGUAGE]: 400,
};

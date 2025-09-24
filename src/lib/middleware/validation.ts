/**
 * Input validation utilities for API routes
 */

import { NextRequest } from "next/server";
import { APIError } from "../errors/errorHandler";
import { ErrorCode } from "../errors/errorCodes";
import { ValidationRule, ValidationResult } from "@/types/api";

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T = any>(
  req: NextRequest,
  schema: ValidationSchema,
): Promise<
  | { isValid: true; data: T }
  | { isValid: false; errors: Record<string, string[]> }
> {
  try {
    const body = await req.json();
    return validateData(body, schema);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw APIError.create(
        ErrorCode.INVALID_REQUEST,
        { originalError: "Invalid JSON in request body" },
        "Request body must be valid JSON",
      );
    }
    throw error;
  }
}

/**
 * Validate data against schema
 */
export function validateData<T = any>(
  data: any,
  schema: ValidationSchema,
):
  | { isValid: true; data: T }
  | { isValid: false; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};
  const validatedData: any = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];
    const fieldErrors: string[] = [];

    // Check required fields
    if (
      rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      fieldErrors.push(`${field} is required`);
      errors[field] = fieldErrors;
      continue;
    }

    // Skip validation if field is not required and not provided
    if (
      !rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      continue;
    }

    // Type validation
    if (!validateType(value, rule.type)) {
      fieldErrors.push(`${field} must be of type ${rule.type}`);
    }

    // String validations
    if (rule.type === "string" && typeof value === "string") {
      if (rule.minLength && value.length < rule.minLength) {
        fieldErrors.push(
          `${field} must be at least ${rule.minLength} characters long`,
        );
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        fieldErrors.push(
          `${field} must be at most ${rule.maxLength} characters long`,
        );
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        fieldErrors.push(`${field} format is invalid`);
      }
    }

    // Number validations
    if (rule.type === "number" && typeof value === "number") {
      if (rule.min !== undefined && value < rule.min) {
        fieldErrors.push(`${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        fieldErrors.push(`${field} must be at most ${rule.max}`);
      }
    }

    // Array validations
    if (rule.type === "array" && Array.isArray(value)) {
      if (rule.minLength && value.length < rule.minLength) {
        fieldErrors.push(
          `${field} must contain at least ${rule.minLength} items`,
        );
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        fieldErrors.push(
          `${field} must contain at most ${rule.maxLength} items`,
        );
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      fieldErrors.push(`${field} must be one of: ${rule.enum.join(", ")}`);
    }

    // Custom validation
    if (rule.customValidator) {
      const customResult = rule.customValidator(value, data);
      if (customResult !== true) {
        fieldErrors.push(
          typeof customResult === "string"
            ? customResult
            : `${field} is invalid`,
        );
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    } else {
      validatedData[field] = value;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: validatedData as T };
}

/**
 * Validate data type
 */
function validateType(
  value: any,
  expectedType: ValidationRule["type"],
): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    default:
      return false;
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // User authentication
  userId: {
    type: "string" as const,
    required: true,
    minLength: 1,
    maxLength: 100,
  },

  // Code-related fields
  code: {
    type: "string" as const,
    required: true,
    minLength: 1,
    maxLength: 100000, // 100KB limit
  },

  language: {
    type: "string" as const,
    required: true,
    enum: [
      "java",
      "javascript",
      "typescript",
      "python",
      "cpp",
      "c",
      "go",
      "rust",
      "csharp",
      "php",
      "ruby",
      "swift",
      "kotlin",
    ],
  },

  // File operations
  filePath: {
    type: "string" as const,
    required: true,
    minLength: 1,
    maxLength: 500,
    pattern: /^[^\/].*$/, // Should not start with /
    customValidator: (value: string) => {
      // Prevent directory traversal
      if (value.includes("..") || value.includes("//")) {
        return "Invalid file path";
      }
      return true;
    },
  },

  repoName: {
    type: "string" as const,
    required: true,
    minLength: 1,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9._-]+$/,
  },

  // Test cases
  testCase: {
    type: "object" as const,
    required: true,
    customValidator: (value: any) => {
      if (!value.input || !Array.isArray(value.input)) {
        return "testCase.input must be an array";
      }
      if (value.output === undefined) {
        return "testCase.output is required";
      }
      return true;
    },
  },

  // Chat messages
  messages: {
    type: "array" as const,
    required: true,
    minLength: 1,
    maxLength: 100,
    customValidator: (value: any[]) => {
      for (const msg of value) {
        if (!msg.role || !msg.content) {
          return "Each message must have role and content";
        }
        if (!["user", "assistant"].includes(msg.role)) {
          return "Message role must be user or assistant";
        }
        if (
          typeof msg.content !== "string" ||
          msg.content.trim().length === 0
        ) {
          return "Message content must be a non-empty string";
        }
      }
      return true;
    },
  },

  // Payment
  planId: {
    type: "string" as const,
    required: true,
    minLength: 1,
    maxLength: 50,
  },

  amount: {
    type: "number" as const,
    required: true,
    min: 1,
    max: 100000, // Max 1 lakh rupees
  },

  credits: {
    type: "number" as const,
    required: true,
    min: 1,
    max: 10000,
  },

  // Razorpay
  razorpayOrderId: {
    type: "string" as const,
    required: true,
    pattern: /^order_[a-zA-Z0-9]+$/,
  },

  razorpayPaymentId: {
    type: "string" as const,
    required: true,
    pattern: /^pay_[a-zA-Z0-9]+$/,
  },

  razorpaySignature: {
    type: "string" as const,
    required: true,
    minLength: 1,
    maxLength: 500,
  },
};

/**
 * Validate and extract common request patterns
 */
export async function validateAIExecuteRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    code: commonSchemas.code,
    language: commonSchemas.language,
    testCase: commonSchemas.testCase,
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for code execution",
    );
  }

  return validation.data;
}

export async function validateAnalysisRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    code: { ...commonSchemas.code, minLength: 10 },
    language: { ...commonSchemas.language, required: false },
    messages: { ...commonSchemas.messages, required: false },
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for code analysis",
    );
  }

  return validation.data;
}

export async function validateChatbotRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    messages: commonSchemas.messages,
    currentTab: {
      type: "object" as const,
      required: false,
      customValidator: (value: any) => {
        if (!value) return true; // Optional
        if (!value.code || !value.language) {
          return "currentTab must have code and language";
        }
        return true;
      },
    },
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for chatbot",
    );
  }

  return validation.data;
}

export async function validateGitHubFileRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    repo: commonSchemas.repoName,
    path: commonSchemas.filePath,
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for GitHub file access",
    );
  }

  return validation.data;
}

export async function validateGitHubSaveRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    repo: commonSchemas.repoName,
    path: commonSchemas.filePath,
    content: commonSchemas.code,
    message: {
      type: "string" as const,
      required: true,
      minLength: 1,
      maxLength: 200,
    },
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for GitHub file save",
    );
  }

  return validation.data;
}

export async function validatePaymentOrderRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    planId: commonSchemas.planId,
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for payment order",
    );
  }

  return validation.data;
}

export async function validatePaymentVerificationRequest(req: NextRequest) {
  const validation = await validateRequestBody(req, {
    razorpay_order_id: commonSchemas.razorpayOrderId,
    razorpay_payment_id: commonSchemas.razorpayPaymentId,
    razorpay_signature: commonSchemas.razorpaySignature,
    planId: commonSchemas.planId,
  });

  if (!validation.isValid) {
    throw APIError.create(
      ErrorCode.INVALID_REQUEST,
      { validationErrors: validation.errors },
      "Invalid request format for payment verification",
    );
  }

  return validation.data;
}

/**
 * Sanitize input data
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

export function sanitizeCode(input: string): string {
  // Basic sanitization - remove potentially dangerous patterns
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

/**
 * Rate limiting helper
 */
export function createRateLimitKey(identifier: string, action: string): string {
  return `rate_limit:${identifier}:${action}`;
}

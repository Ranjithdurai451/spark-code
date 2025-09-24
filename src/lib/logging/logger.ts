/**
 * Centralized logging utility with structured logging and error tracking
 */

import { ErrorCode } from "../errors/errorCodes";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  processingTime?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: ErrorCode;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  private shouldLog(level: LogLevel): boolean {
    const levels = ["debug", "info", "warn", "error"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        code: (error as any).code,
      };
    }

    return entry;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;

    const entry = this.createLogEntry("debug", message, context);
    console.debug(this.formatMessage("debug", message, context));

    this.persistLog(entry);
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;

    const entry = this.createLogEntry("info", message, context);
    console.info(this.formatMessage("info", message, context));

    this.persistLog(entry);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("warn")) return;

    const entry = this.createLogEntry("warn", message, context, error);
    console.warn(this.formatMessage("warn", message, context), error);

    this.persistLog(entry);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog("error")) return;

    const entry = this.createLogEntry("error", message, context, error);
    console.error(this.formatMessage("error", message, context), error);

    this.persistLog(entry);
    this.reportError(entry);
  }

  // Specialized logging methods for common scenarios

  apiRequest(method: string, url: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${url}`, {
      ...context,
      method,
      url,
      type: "api_request",
    });
  }

  apiResponse(
    method: string,
    url: string,
    statusCode: number,
    processingTime: number,
    context?: LogContext,
  ): void {
    const level = statusCode >= 400 ? "warn" : "info";
    const message = `API Response: ${method} ${url} - ${statusCode} (${processingTime}ms)`;

    this[level](message, {
      ...context,
      method,
      url,
      statusCode,
      processingTime,
      type: "api_response",
    });
  }

  authEvent(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth Event: ${event}`, {
      ...context,
      userId,
      event,
      type: "auth",
    });
  }

  creditTransaction(
    userId: string,
    type: string,
    amount: number,
    feature?: string,
    context?: LogContext,
  ): void {
    this.info(`Credit Transaction: ${type} ${amount}`, {
      ...context,
      userId,
      transactionType: type,
      amount,
      feature,
      type: "credit_transaction",
    });
  }

  externalAPI(
    service: string,
    operation: string,
    success: boolean,
    context?: LogContext,
    error?: Error,
  ): void {
    const level = success ? "debug" : "warn";
    const message = `External API: ${service}.${operation} - ${success ? "success" : "failed"}`;

    this[level](
      message,
      {
        ...context,
        service,
        operation,
        success,
        type: "external_api",
      },
      error,
    );
  }

  codeExecution(
    language: string,
    success: boolean,
    executionTime: number,
    context?: LogContext,
    error?: Error,
  ): void {
    const level = success ? "info" : "warn";
    const message = `Code Execution: ${language} - ${success ? "success" : "failed"} (${executionTime}ms)`;

    this[level](
      message,
      {
        ...context,
        language,
        success,
        executionTime,
        type: "code_execution",
      },
      error,
    );
  }

  // Performance monitoring
  performance(
    operation: string,
    duration: number,
    threshold?: number,
    context?: LogContext,
  ): void {
    const isSlow = threshold && duration > threshold;
    const level = isSlow ? "warn" : "debug";
    const message = `Performance: ${operation} took ${duration}ms${isSlow ? ` (threshold: ${threshold}ms)` : ""}`;

    this[level](message, {
      ...context,
      operation,
      duration,
      threshold,
      isSlow,
      type: "performance",
    });
  }

  // Security events
  security(
    event: string,
    severity: "low" | "medium" | "high",
    context?: LogContext,
  ): void {
    const level =
      severity === "high" ? "error" : severity === "medium" ? "warn" : "info";
    const message = `Security Event: ${event} (severity: ${severity})`;

    this[level](message, {
      ...context,
      event,
      severity,
      type: "security",
    });
  }

  // Business metrics
  metric(
    name: string,
    value: number,
    unit?: string,
    context?: LogContext,
  ): void {
    this.info(`Metric: ${name} = ${value}${unit ? ` ${unit}` : ""}`, {
      ...context,
      metric: name,
      value,
      unit,
      type: "metric",
    });
  }

  private persistLog(entry: LogEntry): void {
    // In development, logs are already going to console
    if (this.isDevelopment) return;

    // TODO: Implement log persistence (database, external service, etc.)
    // For now, we'll just keep console logging
    // This could be extended to send logs to services like DataDog, LogRocket, etc.
  }

  private reportError(entry: LogEntry): void {
    // Report critical errors to external monitoring service
    if (entry.level === "error" && entry.error) {
      // TODO: Implement error reporting (Sentry, Rollbar, etc.)
      // For now, just log that we would report it
      console.error("🚨 Would report error to monitoring service:", {
        message: entry.message,
        error: entry.error,
        context: entry.context,
      });
    }
  }

  // Create child logger with persistent context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.logLevel = this.logLevel;
    childLogger.isDevelopment = this.isDevelopment;

    // Override methods to include persistent context
    const originalMethods = ["debug", "info", "warn", "error"] as const;
    originalMethods.forEach((method) => {
      const originalMethod = childLogger[method];
      childLogger[method] = (
        message: string,
        additionalContext?: LogContext,
        error?: Error,
      ) => {
        const mergedContext = { ...context, ...additionalContext };
        originalMethod.call(childLogger, message, mergedContext, error);
      };
    });

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing or custom instances
export { Logger };

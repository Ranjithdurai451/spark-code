import { NextResponse } from "next/server";

/**
 * Standardized API response interface
 */
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

/**
 * Create a successful API response
 */
export function createSuccessResponse<T = any>(
  data: T,
  metadata?: Partial<APIResponse["metadata"]>,
): NextResponse {
  const response: APIResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": response.metadata.requestId,
    },
  });
}

/**
 * Create a paginated API response
 */
export function createPaginatedResponse<T = any>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  metadata?: Partial<APIResponse["metadata"]>,
): NextResponse {
  const response: APIResponse<{
    items: T[];
    pagination: typeof pagination;
  }> = {
    success: true,
    data: {
      items: data,
      pagination,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": response.metadata.requestId,
      "X-Total-Count": pagination.total.toString(),
      "X-Total-Pages": pagination.totalPages.toString(),
      "X-Current-Page": pagination.page.toString(),
    },
  });
}

/**
 * Create a no-content response (for successful operations with no data)
 */
export function createNoContentResponse(
  metadata?: Partial<APIResponse["metadata"]>,
): NextResponse {
  const response: APIResponse = {
    success: true,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(response, {
    status: 204,
    headers: {
      "X-Request-ID": response.metadata.requestId,
    },
  });
}

/**
 * Create a redirect response
 */
export function createRedirectResponse(
  url: string,
  metadata?: Partial<APIResponse["metadata"]>,
): NextResponse {
  const response: APIResponse = {
    success: true,
    data: { redirectUrl: url },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      version: "1.0.0",
      ...metadata,
    },
  };

  return NextResponse.json(response, {
    status: 302,
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": response.metadata.requestId,
      Location: url,
    },
  });
}

/**
 * Create a streaming response for large data or real-time updates
 */
export function createStreamingResponse(
  generator: () => AsyncIterable<any>,
  metadata?: Partial<APIResponse["metadata"]>,
): Response {
  const requestId = generateRequestId();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial metadata
        const initialResponse: Partial<APIResponse> = {
          success: true,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            version: "1.0.0",
            ...metadata,
          },
        };

        controller.enqueue(`data: ${JSON.stringify(initialResponse)}\n\n`);

        // Stream the data
        for await (const chunk of generator()) {
          const dataChunk: Partial<APIResponse> = {
            success: true,
            data: chunk,
            metadata: {
              timestamp: new Date().toISOString(),
              requestId,
              version: "1.0.0",
            },
          };

          controller.enqueue(`data: ${JSON.stringify(dataChunk)}\n\n`);
        }

        // Send completion signal
        const completionChunk: Partial<APIResponse> = {
          success: true,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            version: "1.0.0",
            completed: true,
          },
        };

        controller.enqueue(`data: ${JSON.stringify(completionChunk)}\n\n`);
        controller.close();
      } catch (error) {
        const errorChunk: Partial<APIResponse> = {
          success: false,
          error: {
            code: "STREAM_ERROR",
            message: "Error during streaming",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId,
            version: "1.0.0",
          },
        };

        controller.enqueue(`data: ${JSON.stringify(errorChunk)}\n\n`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Request-ID": requestId,
    },
  });
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

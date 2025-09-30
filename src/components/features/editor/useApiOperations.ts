import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { useCredentialsStore } from "@/components/root/credentialsStore";
import { invalidateCreditsExact } from "@/lib/utils";
import type { CreditsUser } from "@/lib/credits/types";

interface AnalyzeParams {
  code: string;
  language: string;
}

interface GenerateTestsParams {
  code: string;
  language: string;
  type?: string;
}

interface ExecuteParams {
  code: string;
  language: string;
  input?: string;
}

interface ExecuteResult {
  output: string;
  status: string;
  time?: string;
  memory?: string;
  exitCode?: number;
}

export function useAnalyzeMutation() {
  const { clearApiKeys } = useCredentialsStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, language }: AnalyzeParams) => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle unified error format
        if (errorData.success === false && errorData.error) {
          if (
            errorData.error.code === "CONFIGURATION_ERROR" ||
            errorData.error.code === "UNAUTHENTICATED" ||
            errorData.error.message?.includes("API key")
          ) {
            clearApiKeys();
          }
          throw new Error(errorData.error.message || errorData.error.code);
        }

        throw new Error(errorData.error || "Analysis failed");
      }

      return response;
    },
    onSuccess: () => {
      // Efficiently invalidate credits queries
      invalidateCreditsExact(queryClient);
    },
    onError: () => {
      // Also invalidate on error to ensure credits are up to date
      invalidateCreditsExact(queryClient);
    },
  });
}

export function useGenerateTestsMutation() {
  const { clearApiKeys } = useCredentialsStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, language, type }: GenerateTestsParams) => {
      const response = await fetch("/api/generate-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, type }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle unified error format
        if (errorData.success === false && errorData.error) {
          if (
            errorData.error.code === "CONFIGURATION_ERROR" ||
            errorData.error.code === "UNAUTHENTICATED" ||
            errorData.error.message?.includes("API key")
          ) {
            clearApiKeys();
          }
          throw new Error(errorData.error.message || errorData.error.code);
        }

        throw new Error(errorData.error || "Test generation failed");
      }

      return response;
    },
    onSuccess: () => {
      // Efficiently invalidate credits queries
      invalidateCreditsExact(queryClient);
    },
    onError: () => {
      // Also invalidate on error to ensure credits are up to date
      invalidateCreditsExact(queryClient);
    },
  });
}

export function useExecuteMutation() {
  const queryClient = useQueryClient();

  return useMutation<ExecuteResult, Error, ExecuteParams>({
    mutationFn: async ({ code, language, input }: ExecuteParams) => {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, input }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle unified error format
        if (responseData.success === false && responseData.error) {
          throw new Error(
            responseData.error.message || responseData.error.code,
          );
        }

        throw new Error(responseData.error || "Execution failed");
      }

      // Return the data part of the successful response
      return responseData.data;
    },
    onSuccess: () => {
      // Efficiently invalidate credits queries
      invalidateCreditsExact(queryClient);
    },
    onError: () => {
      // Also invalidate on error to ensure credits are up to date
      invalidateCreditsExact(queryClient);
    },
  });
}

export function useUserCredits(enabled = true) {
  return useQuery<CreditsUser>({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/credits");
      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = "Failed to fetch credits";

        // Handle unified error response format
        if (errorData.success === false && errorData.error) {
          errorMessage =
            errorData.error.message || errorData.error.code || errorMessage;
        } else if (errorData.error) {
          // Fallback for old format during transition
          errorMessage = errorData.error;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Handle unified success response format
      if (data.success === true && data.data) {
        return data.data.user;
      } else if (data.success === false) {
        throw new Error(data.error?.message || "API returned error");
      }

      // Fallback for old format during transition
      return data.user;
    },
    staleTime: 1000 * 30, // 30 seconds - more frequent updates for credits
    gcTime: 1000 * 60 * 5, // 5 minutes cache time
    enabled,
  });
}

// Legacy hooks for backward compatibility with useChat
export function useAnalyzeChat() {
  const { clearApiKeys } = useCredentialsStore();
  const queryClient = useQueryClient();

  return useChat({
    api: "/api/analyze",
    onError: (error) => {
      try {
        const errorContent = JSON.parse(error.message);
        if (errorContent.success === false && errorContent.error) {
          if (
            errorContent.error.code === "CONFIGURATION_ERROR" ||
            errorContent.error.code === "UNAUTHENTICATED" ||
            errorContent.error.message?.includes("API key")
          ) {
            clearApiKeys();
          }
        }
      } catch (parseError) {
        // Use raw error message if JSON parsing fails
      }
      // Invalidate credits on error
      invalidateCreditsExact(queryClient);
    },
    onFinish: () => {
      // Invalidate credits on success
      invalidateCreditsExact(queryClient);
    },
  });
}

export function useGenerateTestsChat() {
  const { clearApiKeys } = useCredentialsStore();
  const queryClient = useQueryClient();

  return useChat({
    api: "/api/generate-tests",
    onError: (error) => {
      try {
        const errorContent = JSON.parse(error.message);
        if (errorContent.success === false && errorContent.error) {
          if (
            errorContent.error.code === "CONFIGURATION_ERROR" ||
            errorContent.error.code === "UNAUTHENTICATED" ||
            errorContent.error.message?.includes("API key")
          ) {
            clearApiKeys();
          }
        }
      } catch (parseError) {
        // Use raw error message if JSON parsing fails
      }
      // Invalidate credits on error
      invalidateCreditsExact(queryClient);
    },
    onFinish: () => {
      // Invalidate credits on success
      invalidateCreditsExact(queryClient);
    },
  });
}

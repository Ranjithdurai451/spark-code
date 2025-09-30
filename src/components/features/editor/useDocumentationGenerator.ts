import { useState } from "react";
import { useEditorStore } from "./editorStore";
import { useCredentialsStore } from "@/components/root/credentialsStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateCreditsExact } from "@/lib/utils";

interface GenerateDocumentationParams {
  code: string;
  language: string;
}

export const useGenerateDocumentationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, language }: GenerateDocumentationParams) => {
      const response = await fetch("/api/generate-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = "Documentation generation failed";

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

      // Simple text response - no streaming artifacts
      const documentedCode = await response.text();
      return documentedCode;
    },
    onSuccess: () => {
      // Invalidate credits query to refresh balance
      invalidateCreditsExact(queryClient);
    },
    onError: () => {
      // Also invalidate on error to ensure credits are up to date
      invalidateCreditsExact(queryClient);
    },
  });
};

// Legacy hook for backward compatibility
export const useDocumentationGenerator = () => {
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const { getActiveTab, updateTab } = useEditorStore();
  const mutation = useGenerateDocumentationMutation();

  const generateDocumentation = async () => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.code || activeTab.code.trim().length < 20)
      return;

    try {
      setIsGeneratingDocs(true);
      const documentedCode = await mutation.mutateAsync({
        code: activeTab.code,
        language: activeTab.language,
      });

      // Update Monaco Editor with clean documented code
      updateTab(activeTab.id, {
        code: documentedCode.trim(),
        isDirty: true,
        lastModified: Date.now(),
      });
    } catch (error) {
      console.error("Documentation failed:", error);
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  return {
    generateDocumentation,
    isGeneratingDocs: mutation.isPending || isGeneratingDocs,
  };
};

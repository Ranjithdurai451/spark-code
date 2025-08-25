import { useState } from "react";
import { useEditorStore } from "./editorStore";
import { useCredentialsStore } from "@/components/root/credentialsStore";

export const useDocumentationGenerator = () => {
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const { getActiveTab, updateTab } = useEditorStore();
  const { geminiApiKey } = useCredentialsStore();

  const generateDocumentation = async () => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.code || activeTab.code.trim().length < 20)
      return;

    try {
      setIsGeneratingDocs(true);

      const response = await fetch("/api/generate-documentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeTab.code,
          language: activeTab.language,
          geminiApiKey: geminiApiKey?.value,
        }),
      });

      if (!response.ok) throw new Error("Documentation generation failed");

      // Simple text response - no streaming artifacts
      const documentedCode = await response.text();

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

  return { generateDocumentation, isGeneratingDocs };
};

"use client";
import MonacoEditor from "@monaco-editor/react";
import { useEditorStore } from "../store/editorStore";
import Tabs from "./Tabs";
import { useTheme } from "next-themes";
import { Card } from "./ui/card";

export default function CodeEditor() {
  const { theme } = useTheme();
  const { tabs, activeTabId, updateTab, fontSize } = useEditorStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No active tab</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col ">
      <Tabs />
      <div className="flex-1   overflow-hidden  ">
        <MonacoEditor
          height="100%"
          language={activeTab.language}
          value={activeTab.code}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            fontSize,
            // minimap: { enabled: true },
            lineNumbers: "on",
            formatOnType: true,
            formatOnPaste: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: "selection",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontLigatures: true,
            bracketPairColorization: { enabled: true }
          }}
          onChange={(value) => {
            updateTab(activeTab.id, { code: value ?? "" });
          }}
        />
      </div>
    </div>
  );
}

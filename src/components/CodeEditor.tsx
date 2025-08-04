"use client";
import MonacoEditor from "@monaco-editor/react";
import { useEditorStore } from "../store/editorStore";
import Tabs from "./Tabs";
import { useTheme } from "next-themes";
import { useRef, useEffect } from "react";
// @ts-expect-error: monaco-vim has no type declarations
import { initVimMode, VimMode } from "monaco-vim";

export default function CodeEditor() {
  const { theme } = useTheme();
  const {
    tabs,
    activeTabId,
    updateTab,
    fontSize,
    isVimModeEnabled,
    relativeLineNumbers,
    wordWrap
  } = useEditorStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);

  // Handle Vim mode changes
  useEffect(() => {
    if (!editorRef.current || !statusBarRef.current) return;

    // Cleanup old mode if disabling
    if (!isVimModeEnabled && vimModeRef.current) {
      vimModeRef.current.dispose();
      vimModeRef.current = null;
      statusBarRef.current.innerHTML = "";
    }

    // Enable mode if toggled on (but only if not already initialized)
    if (isVimModeEnabled && !vimModeRef.current) {
      vimModeRef.current = initVimMode(editorRef.current, statusBarRef.current);
      setTimeout(() => {
        VimMode.Vim.map('jj', '<Esc>', 'insert');
        VimMode.Vim.map('jk', '<Esc>', 'insert');
      }, 100);
    }
  }, [isVimModeEnabled]);


  // Handle relative line numbers
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        lineNumbers: relativeLineNumbers ? 'relative' : 'on'
      });
    }
  }, [relativeLineNumbers]);

  // Handle word wrap
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        wordWrap: wordWrap ? 'on' : 'off'
      });
    }
  }, [wordWrap]);

  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
    };
  }, []);

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
    <div className="h-full flex flex-col">
      <Tabs />

      {/* Vim Status Bar */}
      {isVimModeEnabled && (
        <div className="flex items-center justify-between px-4 py-1 bg-muted/30 border-b text-xs">
          <span className="text-muted-foreground font-medium">Vim Mode</span>
          <div
            ref={statusBarRef}
            className="font-mono text-primary min-h-[16px]"
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          language={activeTab.language}
          value={activeTab.code}
          theme={theme === "dark" ? "vs-dark" : "light"}
          options={{
            fontSize,
            minimap: { enabled: false },
            lineNumbers: relativeLineNumbers ? 'relative' : 'on',
            formatOnType: true,
            formatOnPaste: true,
            wordWrap: wordWrap ? 'on' : 'off',
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
          onMount={(editor) => {
            editorRef.current = editor;

            // Re-init Vim mode if it's enabled
            if (isVimModeEnabled && statusBarRef.current) {
              vimModeRef.current = initVimMode(editor, statusBarRef.current);

              setTimeout(() => {
                VimMode.Vim.map('jj', '<Esc>', 'insert');
                VimMode.Vim.map('jk', '<Esc>', 'insert');
              }, 100);
            }
          }}

          onChange={(value) => {
            updateTab(activeTab.id, { code: value ?? "" });
          }}
        />
      </div>
    </div>
  );
}

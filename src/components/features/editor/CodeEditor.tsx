"use client";
import MonacoEditor from "@monaco-editor/react";
import { useEditorStore, getLanguageConfig } from "./editorStore";
import { useRef, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Tabs from "./Tabs";
import { useThemeStore } from "../themes/theme-store";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

// Dynamic imports for monaco-vim and prettier to avoid SSR issues
let initVimMode: any = null;
let VimMode: any = null;
let prettier: any = null;
let prettierPluginBabel: any = null;
let prettierPluginEstree: any = null;
let prettierPluginTypeScript: any = null;
let prettierPluginJava: any = null;

const loadVimMode = async () => {
  if (typeof window !== "undefined" && (!initVimMode || !VimMode)) {
    try {
      // @ts-ignore: No types for monaco-vim
      const vimModule = await import("monaco-vim");
      initVimMode = vimModule.initVimMode;
      VimMode = vimModule.VimMode;
    } catch (error) {
      console.error("Failed to load monaco-vim:", error);
    }
  }
};

const loadPrettier = async () => {
  if (typeof window !== "undefined" && !prettier) {
    try {
      // Dynamic imports for prettier and plugins
      prettier = (await import("prettier/standalone")).default;
      prettierPluginBabel = (await import("prettier/plugins/babel")).default;
      prettierPluginEstree = (await import("prettier/plugins/estree")).default;
      prettierPluginTypeScript = (await import("prettier/plugins/typescript")).default;
      // Load Java plugin for prettier
      try {
        prettierPluginJava = (await import("prettier-plugin-java")).default;
      } catch (error) {
        console.warn("Java plugin for prettier not available:", error);
        prettierPluginJava = null;
      }
    } catch (error) {
      console.error("Failed to load prettier:", error);
    }
  }
};

// Simple Loading Component
const MonacoLoader = () => (
  <div className="h-full w-full flex items-center justify-center bg-background">
    <div className="flex items-center space-x-2">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Loading editor...</span>
    </div>
  </div>
);

export default function CodeEditorComponent() {
  const { themeState } = useThemeStore();
  const {
    tabs,
    activeTabId,
    updateTab,
    fontSize,
    isVimModeEnabled,
    relativeLineNumbers,
    wordWrap,
    tabSize,
    insertSpaces,
    formatOnSave,
    isFormatSupported
  } = useEditorStore();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const [isFormatting, setIsFormatting] = useState(false);
  const [editorKey, setEditorKey] = useState(0); // Key to force re-mount
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);

  // Load vim mode and prettier dynamically
  useEffect(() => {
    if (isVimModeEnabled) {
      loadVimMode();
    }
    loadPrettier();
  }, [isVimModeEnabled]);

  // Force editor re-mount when vim mode changes
  useEffect(() => {
    // Cleanup existing vim mode before re-mount
    if (vimModeRef.current) {
      try {
        vimModeRef.current.dispose();
      } catch (error) {
        console.warn("Error disposing vim mode:", error);
      }
      vimModeRef.current = null;
    }
    // Clear status bar
    if (statusBarRef.current) {
      statusBarRef.current.innerHTML = "";
    }
    // Force re-mount by changing key
    setEditorKey(prev => prev + 1);
  }, [isVimModeEnabled]);

  // Format code function
  const formatCode = useCallback(async (code: string, language: string): Promise<string> => {
    if (!prettier) {
      await loadPrettier();
    }
    if (!prettier) {
      throw new Error("Prettier is not available");
    }
    let parser: string;
    let plugins: any[] = [];
    switch (language) {
      case "javascript":
        parser = "babel";
        plugins = [prettierPluginBabel, prettierPluginEstree];
        break;
      case "typescript":
        parser = "typescript";
        plugins = [prettierPluginTypeScript, prettierPluginEstree];
        break;
      case "java":
        if (!prettierPluginJava) {
          throw new Error("Java formatting plugin is not available");
        }
        parser = "java";
        plugins = [prettierPluginJava];
        break;
      default:
        throw new Error(`Formatting not supported for ${language}`);
    }
    const options = {
      parser,
      plugins,
      printWidth: 80,
      tabWidth: tabSize,
      useTabs: !insertSpaces,
      semi: true,
      singleQuote: language == "javascript" || language == "typescript",
      quoteProps: "as-needed" as const,
      trailingComma: "es5" as const,
      bracketSpacing: true,
      bracketSameLine: false,
      arrowParens: "avoid" as const,
    };
    return await prettier.format(code, options);
  }, [tabSize, insertSpaces]);

  // Handle format code action
  const handleFormatCode = useCallback(async () => {
    if (!activeTab || !isFormatSupported()) {
      const config = activeTab ? getLanguageConfig(activeTab.language) : null;
      toast.error(`Code formatting is not yet supported for ${config?.displayName || 'this language'}`);
      return;
    }
    setIsFormatting(true);
    try {
      const formattedCode = await formatCode(activeTab.code, activeTab.language);
      updateTab(activeTab.id, { code: formattedCode });
      toast.success("Code formatted successfully!");
    } catch (error: any) {
      console.error("Format error:", error);
      toast.error(`Failed to format code: ${error.message}`);
    } finally {
      setIsFormatting(false);
    }
  }, [activeTab, formatCode, updateTab, isFormatSupported]);

  // Handle format on save
  useEffect(() => {
    if (formatOnSave && activeTab && isFormatSupported()) {
      const timeoutId = setTimeout(() => {
        handleFormatCode();
      }, 1000); // Format 1 second after last edit
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab?.code, formatOnSave, handleFormatCode, isFormatSupported]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        try {
          vimModeRef.current.dispose();
        } catch (error) {
          console.warn("Error disposing vim mode on unmount:", error);
        }
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

  const config = getLanguageConfig(activeTab.language);

  return (
    <div className="h-full flex flex-col relative">
      {/* Pass format handler to Tabs component */}
      <Tabs onFormatCode={handleFormatCode} isFormatting={isFormatting} />

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
          key={editorKey} // Force re-mount when vim mode changes
          height="100%"
          language={activeTab.language === 'typescript' ? 'typescript' : activeTab.language}
          value={activeTab.code}
          theme={themeState.currentMode === "dark" ? "vs-dark" : "light"}
          loading={<MonacoLoader />}
          options={{
            fontSize,
            minimap: { enabled: false },
            lineNumbers: relativeLineNumbers ? 'relative' : 'on',
            formatOnType: true,
            formatOnPaste: true,
            wordWrap: wordWrap ? 'on' : 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize,
            insertSpaces,
            renderWhitespace: "selection",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontLigatures: true,
            bracketPairColorization: { enabled: true },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: "on",
            snippetSuggestions: "top",
          }}
          onMount={async (editor) => {
            editorRef.current = editor;

            // Initialize vim mode if enabled
            if (isVimModeEnabled && statusBarRef.current) {
              await loadVimMode();
              if (initVimMode) {
                try {
                  vimModeRef.current = initVimMode(editor, statusBarRef.current);
                  // Add custom mappings after initialization
                  setTimeout(() => {
                    if (VimMode?.Vim?.map) {
                      VimMode.Vim.map('jj', '<Esc>', 'insert');
                      VimMode.Vim.map('jk', '<Esc>', 'insert');
                    }
                  }, 100);
                  // Fix: Add format shortcut for Vim mode using Vim's key mapping
                  // This will map <leader>f in normal mode to trigger formatting
                  setTimeout(() => {
                    if (VimMode?.Vim?.defineEx) {
                      // :Format command in Vim
                      VimMode.Vim.defineEx('Format', '', function (_cm: any, _input: any) {
                        handleFormatCode();
                      });
                    }
                  }, 200);
                } catch (error) {
                  console.error("Error initializing vim mode:", error);
                }
              }
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
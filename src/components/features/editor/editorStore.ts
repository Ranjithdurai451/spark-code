import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Supported programming languages for the LeetCode-style coding platform
 */
export type Language = "java" | "python" | "javascript" | "typescript" | "cpp" | "c" | "go";

/**
 * Configuration interface for each programming language
 */
export interface LanguageConfig {
  /** Language identifier */
  name: Language;
  /** Default filename when saving/downloading code */
  filename: string;
  /** Starting code template with proper structure for LeetCode-style problems */
  defaultCode: string;
  /** Human-readable language name */
  displayName: string;
  /** File extension for syntax highlighting and IDE features */
  extension: string;
  /** Whether formatting is supported for this language */
  formatSupported: boolean;
}

/**
 * Language configurations with simple Hello World templates
 */
export const languages: LanguageConfig[] = [
  {
    name: "java",
    filename: "Main.java",
    displayName: "Java",
    extension: "java",
    formatSupported: true,
    defaultCode: `// Write a LeetCode-like problem in a function to analyze and generate tests in comments

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
  },
  {
    name: "python",
    filename: "solution.py",
    displayName: "Python",
    extension: "py",
    formatSupported: false,
    defaultCode: `# Write a LeetCode-like problem in a function to analyze and generate tests in comments

print("Hello World")`,
  },
  {
    name: "javascript",
    filename: "solution.js",
    displayName: "JavaScript",
    extension: "js",
    formatSupported: true,
    defaultCode: `// Write a LeetCode-like problem in a function to analyze and generate tests in comments

console.log("Hello World");`,
  },
  {
    name: "typescript",
    filename: "solution.ts",
    displayName: "TypeScript",
    extension: "ts",
    formatSupported: true,
    defaultCode: `// Write a LeetCode-like problem in a function to analyze and generate tests in comments

console.log("Hello World");`,
  },
  {
    name: "cpp",
    filename: "solution.cpp",
    displayName: "C++",
    extension: "cpp",
    formatSupported: false,
    defaultCode: `// Write a LeetCode-like problem in a function to analyze and generate tests in comments

#include <iostream>

int main() {
    std::cout << "Hello World" << std::endl;
    return 0;
}`,
  },
  {
    name: "c",
    filename: "solution.c",
    displayName: "C",
    extension: "c",
    formatSupported: false,
    defaultCode: `// Write a LeetCode-like problem in a function to analyze and generate tests in comments

#include <stdio.h>

int main() {
    printf("Hello World\\n");
    return 0;
}`,
  },
  {
    name: "go",
    filename: "solution.go",
    displayName: "Go",
    extension: "go",
    formatSupported: false,
    defaultCode: `// Write a LeetCode-like problem in a function to analyze and generate tests in comments

package main

import "fmt"

func main() {
    fmt.Println("Hello World")
}`,
  },
];

/**
 * Represents an editor tab with code content
 */
export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** Display name of the tab (usually filename) */
  name: string;
  /** Programming language for syntax highlighting and execution */
  language: Language;
  /** Source code content */
  code: string;
  /** Whether the tab has unsaved changes */
  isDirty?: boolean;
  /** Timestamp when the tab was created */
  createdAt?: number;
  /** Timestamp when the tab was last modified */
  lastModified?: number;
}

/**
 * Main editor state management interface
 */
interface EditorState {
  // Tab Management
  /** Array of open editor tabs */
  tabs: Tab[];
  /** ID of the currently active tab */
  activeTabId: string | null;
  
  // Editor Settings
  /** Font size in pixels for the code editor */
  fontSize: number;
  /** Whether Vim key bindings are enabled */
  isVimModeEnabled: boolean;
  /** Whether to show relative line numbers */
  relativeLineNumbers: boolean;
  /** Whether to enable word wrapping */
  wordWrap: boolean;
  /** Editor theme preference */
  theme: "light" | "dark";
  /** Whether to show invisible characters */
  showInvisibles: boolean;
  /** Tab size for indentation */
  tabSize: number;
  /** Whether to use spaces instead of tabs */
  insertSpaces: boolean;
  /** Whether to enable auto formatting on save */
  formatOnSave: boolean;
  
  // Actions - Tab Management
  /** Replace all tabs with the provided array */
  setTabs: (tabs: Tab[]) => void;
  /** Set the active tab by ID */
  setActiveTabId: (id: string) => void;
  /** Update specific properties of a tab */
  updateTab: (id: string, data: Partial<Tab>) => void;
  /** Add a new tab (ID will be auto-generated) */
  addTab: (tab: Omit<Tab, "id">) => void;
  /** Remove a tab by ID */
  removeTab: (id: string) => void;
  /** Mark a tab as having unsaved changes */
  markTabDirty: (id: string) => void;
  /** Mark a tab as saved (no unsaved changes) */
  markTabClean: (id: string) => void;
  /** Close all tabs */
  closeAllTabs: () => void;
  /** Duplicate the current tab */
  duplicateTab: (id: string) => void;
  
  // Actions - Editor Settings
  /** Set the editor font size */
  setFontSize: (size: number) => void;
  /** Toggle Vim mode on/off */
  toggleVimMode: () => void;
  /** Toggle relative line numbers */
  toggleRelativeLineNumbers: () => void;
  /** Toggle word wrap */
  toggleWordWrap: () => void;
  /** Set editor theme */
  setTheme: (theme: "light" | "dark") => void;
  /** Toggle invisible character display */
  toggleShowInvisibles: () => void;
  /** Set tab size for indentation */
  setTabSize: (size: number) => void;
  /** Toggle between spaces and tabs for indentation */
  toggleInsertSpaces: () => void;
  /** Toggle format on save */
  toggleFormatOnSave: () => void;
  
  // Utility Functions
  /** Get the currently active tab */
  getActiveTab: () => Tab | null;
  /** Get a tab by ID */
  getTabById: (id: string) => Tab | null;
  /** Check if any tabs have unsaved changes */
  hasUnsavedChanges: () => boolean;
  /** Check if formatting is supported for active tab */
  isFormatSupported: () => boolean;
}

/**
 * Zustand store for managing editor state with persistence
 */
export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial State
      tabs: [
        {
          id: "1",
          name: languages[0].filename,
          language: languages[0].name,
          code: languages[0].defaultCode,
          isDirty: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
        },
      ],
      activeTabId: "1",
      fontSize: 14,
      isVimModeEnabled: false,
      relativeLineNumbers: false,
      wordWrap: true,
      theme: "dark",
      showInvisibles: false,
      tabSize: 4,
      insertSpaces: true,
      formatOnSave: false,

      // Tab Management Actions
      setTabs: (tabs) => set({ tabs }),
      
      setActiveTabId: (id) => set({ activeTabId: id }),
      
      updateTab: (id, data) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === id 
              ? { ...tab, ...data, lastModified: Date.now() }
              : tab
          ),
        })),
      
      addTab: (tab) => {
        const newId = nanoid();
        const newTab: Tab = {
          ...tab,
          id: newId,
          isDirty: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
        };
        
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newId,
        }));
      },
      
      removeTab: (id) => {
        const state = get();
        const newTabs = state.tabs.filter((tab) => tab.id !== id);
        
        let newActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          // If removing active tab, select the next available tab
          const removedIndex = state.tabs.findIndex((tab) => tab.id === id);
          if (newTabs.length > 0) {
            const nextIndex = Math.min(removedIndex, newTabs.length - 1);
            newActiveId = newTabs[nextIndex].id;
          } else {
            newActiveId = null;
          }
        }
        
        set({ tabs: newTabs, activeTabId: newActiveId });
      },
      
      markTabDirty: (id) => get().updateTab(id, { isDirty: true }),
      
      markTabClean: (id) => get().updateTab(id, { isDirty: false }),
      
      closeAllTabs: () => set({ tabs: [], activeTabId: null }),
      
      duplicateTab: (id) => {
        const tab = get().getTabById(id);
        if (tab) {
          const duplicatedTab = {
            ...tab,
            name: `${tab.name} (Copy)`,
          };
          delete (duplicatedTab as any).id; // Remove id so addTab generates a new one
          get().addTab(duplicatedTab);
        }
      },

      // Editor Settings Actions
      setFontSize: (fontSize) => set({ fontSize }),
      
      toggleVimMode: () =>
        set((state) => ({ isVimModeEnabled: !state.isVimModeEnabled })),
      
      toggleRelativeLineNumbers: () =>
        set((state) => ({ relativeLineNumbers: !state.relativeLineNumbers })),
      
      toggleWordWrap: () =>
        set((state) => ({ wordWrap: !state.wordWrap })),
      
      setTheme: (theme) => set({ theme }),
      
      toggleShowInvisibles: () =>
        set((state) => ({ showInvisibles: !state.showInvisibles })),
      
      setTabSize: (tabSize) => set({ tabSize }),
      
      toggleInsertSpaces: () =>
        set((state) => ({ insertSpaces: !state.insertSpaces })),

      toggleFormatOnSave: () =>
        set((state) => ({ formatOnSave: !state.formatOnSave })),

      // Utility Functions
      getActiveTab: () => {
        const state = get();
        return state.tabs.find((tab) => tab.id === state.activeTabId) || null;
      },
      
      getTabById: (id) => {
        return get().tabs.find((tab) => tab.id === id) || null;
      },
      
      hasUnsavedChanges: () => {
        return get().tabs.some((tab) => tab.isDirty);
      },

      isFormatSupported: () => {
        const activeTab = get().getActiveTab();
        if (!activeTab) return false;
        const config = getLanguageConfig(activeTab.language);
        return config.formatSupported;
      },
    }),
    {
      name: "leetcode-editor-store",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        fontSize: state.fontSize,
        isVimModeEnabled: state.isVimModeEnabled,
        relativeLineNumbers: state.relativeLineNumbers,
        wordWrap: state.wordWrap,
        theme: state.theme,
        showInvisibles: state.showInvisibles,
        tabSize: state.tabSize,
        insertSpaces: state.insertSpaces,
        formatOnSave: state.formatOnSave,
      }),
    }
  )
);

/**
 * Helper function to get language configuration by name
 */
export const getLanguageConfig = (language: Language): LanguageConfig => {
  return languages.find((lang) => lang.name === language) || languages[0];
};

/**
 * Helper function to create a new tab with default settings for a language
 */
export const createNewTab = (language: Language): Omit<Tab, "id"> => {
  const config = getLanguageConfig(language);
  return {
    name: config.filename,
    language: config.name,
    code: config.defaultCode,
    isDirty: false,
    createdAt: Date.now(),
    lastModified: Date.now(),
  };
};

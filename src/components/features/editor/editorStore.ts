import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Language = "java" | "python" | "javascript" | "cpp";

export interface LanguageConfig {
  name: Language;
  filename: string;
  defaultCode: string;
}

export const languages: LanguageConfig[] = [
  {
    name: "java",
    filename: "Main.java",
    defaultCode: `public class Main {
    // Write your code by creating a function below
    
}`,
  },
  {
    name: "python",
    filename: "solution.py",
    defaultCode: `class Solution:
    # Write your code by creating a function below
    pass`,
  },
  {
    name: "javascript",
    filename: "solution.js",
    defaultCode: `// Write your code by creating a function below

`,
  },
  {
    name: "cpp",
    filename: "solution.cpp",
    defaultCode: `class Solution {
public:
    // Write your code by creating a function below
    
};`,
  },
];

export interface Tab {
  id: string;
  name: string;
  language: Language;
  code: string;
}

interface EditorState {
  tabs: Tab[];
  activeTabId: string | null;
  fontSize: number;
  setTabs: (tabs: Tab[]) => void;
  setActiveTabId: (id: string) => void;
  updateTab: (id: string, data: Partial<Tab>) => void;
  addTab: (tab: Omit<Tab, "id">) => void; // Omit id, generate internally
  removeTab: (id: string) => void;
  setFontSize: (size: number) => void;
  isVimModeEnabled: boolean;
  toggleVimMode: () => void;
  relativeLineNumbers: boolean;
  wordWrap: boolean;
  toggleRelativeLineNumbers: () => void;
  toggleWordWrap: () => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      tabs: [
        {
          id: "1",
          name: languages[0].filename,
          language: languages[0].name,
          code: languages[0].defaultCode,
        },
      ],
      activeTabId: "1",
      fontSize: 14,
      isVimModeEnabled: false,
      relativeLineNumbers: false,
      wordWrap: true,
      toggleVimMode: () =>
        set((state) => ({
          isVimModeEnabled: !state.isVimModeEnabled,
        })),
      toggleRelativeLineNumbers: () =>
        set((state) => ({
          relativeLineNumbers: !state.relativeLineNumbers,
        })),
      toggleWordWrap: () =>
        set((state) => ({
          wordWrap: !state.wordWrap,
        })),
      setTabs: (tabs) => set({ tabs }),
      setActiveTabId: (id) => set({ activeTabId: id }),
      updateTab: (id, data) =>
        set({
          tabs: get().tabs.map((tab) =>
            tab.id === id ? { ...tab, ...data } : tab
          ),
        }),
      addTab: (tab) => {
        const newId = nanoid();
        set({
          tabs: [...get().tabs, { ...tab, id: newId }],
          activeTabId: newId,
        });
      },
      removeTab: (id) => {
        const newTabs = get().tabs.filter((tab) => tab.id !== id);
        const newActiveId = newTabs.length > 0 ? newTabs[0].id : null;
        set({ tabs: newTabs, activeTabId: newActiveId });
      },
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: "editor-store",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        fontSize: state.fontSize,
        isVimModeEnabled: state.isVimModeEnabled,
        relativeLineNumbers: state.relativeLineNumbers,
        wordWrap: state.wordWrap,
      }),
    }
  )
);

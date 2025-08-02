import { nanoid } from "nanoid";
import { create } from "zustand";

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
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [
    {
      id: "1",
      name: languages[0].filename,
      language: languages[0].name,
      code: languages[0].defaultCode,
    },
  ],
  activeTabId: "1",
  fontSize: 16,
  setTabs: (tabs) => set({ tabs }),
  setActiveTabId: (id) => set({ activeTabId: id }),
  updateTab: (id, data) =>
    set({
      tabs: get().tabs.map((tab) =>
        tab.id === id ? { ...tab, ...data } : tab,
      ),
    }),
  addTab: (tab) => {
    const newId = nanoid();
    set({ tabs: [...get().tabs, { ...tab, id: newId }], activeTabId: newId });
  },
  removeTab: (id) => {
    const newTabs = get().tabs.filter((tab) => tab.id !== id);
    const newActiveId = newTabs.length > 0 ? newTabs[0].id : null;
    set({ tabs: newTabs, activeTabId: newActiveId });
  },
  setFontSize: (fontSize) => set({ fontSize }),
}));

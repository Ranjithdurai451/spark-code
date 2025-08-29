"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  useEditorStore,
  languages,
  Language
} from "@/components/features/editor/editorStore";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectSeparator
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";

import GitHubFileBrowser from "./GithubFileBroswer";
import { useDocumentationGenerator } from "./useDocumentationGenerator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  Plus,
  X,
  Edit2,
  Code,
  MoreVertical,
  Code2,
  FileText,
  Copy,
  Check,
  UploadCloud,
  FolderPlus,
  AlertCircle,
  Github,
  Info,
  FolderOpen,
  Folder,
  ExternalLink,
  Loader2,
  RotateCcw,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCredentialsStore } from "@/components/root/credentialsStore";

/* ─────────────────────────────────────────────────────────── */

const fileErr = (name: string, lang: Language) => {
  if (!name.trim()) return "Filename cannot be empty";
  if (name.includes("/") || name.includes("\\")) return "Filename cannot contain slashes";
  if (name.length > 100) return "Filename too long";
  return null;
};

const cfg = (l: Language) => languages.find(x => x.name === l)!;
const suggested = (l: Language) => cfg(l).filename;

/* ─────────────────────────────────────────────────────────── */

function validateFileName(name: string, language: Language): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Filename cannot be empty";

  // Disallow path separators
  if (/[\\/]/.test(trimmed)) return "Filename cannot contain slashes";

  // Disallow whitespace anywhere
  if (/\s/.test(trimmed)) return "Filename cannot contain spaces";

  // Disallow illegal characters (Windows + common VCS-problematic)
  if (/[<>:\"|?*#%{}~+`]/.test(trimmed)) return "Filename contains illegal characters";

  // Disallow control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return "Filename contains control characters";

  // Disallow leading dot and trailing dot/space
  if (/^\./.test(trimmed)) return "Filename cannot start with a dot";
  if (/[ .]$/.test(trimmed)) return "Filename cannot end with a dot or space";

  // Reserved DOS device names
  const base = trimmed.replace(/\.[^.]+$/, "");
  const reserved = new Set([
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
  ]);
  if (reserved.has(base.toUpperCase())) return "Filename is a reserved name";

  const config = languages.find((l) => l.name === language);
  if (!config) return "Invalid language selected";
  const expectedExtension = config.extension;

  // Case-insensitive extension check, but preserve exact extension requirement
  const lower = trimmed.toLowerCase();
  if (!lower.endsWith(`.${expectedExtension.toLowerCase()}`)) {
    return `Filename must end with .${expectedExtension}`;
  }

  // Extract base name (without extension)
  const lastIndex = trimmed.toLowerCase().lastIndexOf(`.${expectedExtension.toLowerCase()}`);
  const baseName = trimmed.slice(0, lastIndex);
  if (!baseName) return "Filename must have a name before the extension";

  // Prevent consecutive dots in the base name
  if (/\.\./.test(baseName)) return "Filename cannot contain consecutive dots";

  // Language-specific rules
  if (language === "java") {
    if (!/^[A-Z][A-Za-z0-9_$]*$/.test(baseName)) {
      return "Java class name must be PascalCase and start with a capital letter";
    }
  }

  if (language === "typescript") {
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(baseName)) {
      return "TypeScript filename must be a valid identifier";
    }
  }

  if (language === "python") {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(baseName)) {
      return "Python filename must be a valid module identifier";
    }
  }

  return null;
}

interface Props {
  onFormatCode: () => void;
  isFormatting: boolean;
}

interface FolderItem {
  path: string;
  name: string;
  depth: number;
  hasChildren: boolean;
}

/* ────────────────────────────  Re-usable error card  */
function ErrorCard({
  error,
  title,
  onRetry,
  onClear,
  isRetrying = false
}: {
  error: string;
  title: string;
  onRetry?: () => void;
  onClear?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Card className="py-2 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-red-500 mb-1">
              {title}
            </h4>
            <p className="text-xs text-red-600 dark:text-red-400 mb-2 break-words">
              {error}
            </p>

            {(onRetry || onClear) && (
              <div className="flex gap-2">
                {onRetry && (
                  <Button
                    onClick={onRetry}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    disabled={isRetrying}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {isRetrying ? "Retrying…" : "Retry"}
                  </Button>
                )}
                {onClear && (
                  <Button
                    onClick={onClear}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────── */

export default function Tabs({ onFormatCode, isFormatting }: Props) {
  /* ---------------------- global stores -------------------- */
  const queryClient = useQueryClient();

  // Editor store for tabs
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    isFormatSupported,
  } = useEditorStore();

  // GitHub credentials store 
  const {
    githubUser,
    githubRepo,
    isConnected,
  } = useCredentialsStore();

  const { generateDocumentation, isGeneratingDocs } = useDocumentationGenerator();
  const activeTab = tabs.find(t => t.id === activeTabId);

  /* ------------------------- UI state --------------------- */
  const [showNew, setShowNew] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showSave, setShowSave] = useState(false);

  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<Language>(languages[0].name);
  const [target, setTarget] = useState("");
  const [err, setErr] = useState<string | null>(null);

  /* save dialog */
  const [saveTopic, setSaveTopic] = useState("");
  const [isNewFolder, setIsNewFolder] = useState(false);
  const [customFolder, setCustom] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  /* copy state */
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  /* -------------------------------------------------------- */
  /* ----------- GitHub repo folders query ------------------ */
  const {
    data: foldersData,
    isLoading: loadingFolders,
    error: foldersError,
    refetch: refetchFolders
  } = useQuery({
    queryKey: ["github-folders", githubRepo],
    queryFn: async () => {
      if (!githubRepo) {
        throw new Error("GitHub repository is required");
      }

      const response = await fetch("/api/github-tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repo: githubRepo })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.error || "Failed to fetch folders";

        if (response.status === 401) {
          errorMessage = "Please sign in with GitHub again.";
        } else if (response.status === 403) {
          errorMessage = "Access denied. Check repository permissions.";
        } else if (response.status === 404) {
          errorMessage = "Repository not found. Verify the repository name.";
        }

        throw new Error(errorMessage);
      }

      return response.json();
    },
    enabled: !!(githubRepo && showSave && isConnected),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (count, error: any) => {
      if (
        error.message.includes("sign in") ||
        error.message.includes("Access denied")
      )
        return false;
      return count < 2;
    }
  });

  /*  flatten + normalize repo tree  */
  const processedFolders = useMemo<FolderItem[]>(() => {
    if (!foldersData?.files) return [];

    const folderSet = new Set<string>();
    for (const file of foldersData.files) {
      if (file.type === "tree") {
        folderSet.add(file.path);
      } else {
        const parts = file.path.split("/");
        for (let i = 0; i < parts.length - 1; i++) {
          folderSet.add(parts.slice(0, i + 1).join("/"));
        }
      }
    }

    const folders = Array.from(folderSet).sort();
    return folders.map(fp => {
      const parts = fp.split("/");
      return {
        path: fp,
        name: parts[parts.length - 1],
        depth: parts.length - 1,
        hasChildren: folders.some(f => f !== fp && f.startsWith(fp + "/"))
      };
    });
  }, [foldersData]);

  const hasFolders = processedFolders.length > 0;

  /* auto-switch to "new folder" mode when repo empty */
  useEffect(() => {
    if (!hasFolders) {
      setIsNewFolder(true);
      setSaveTopic("");
    }
  }, [hasFolders]);

  /* ----------------- save-to-GitHub mutation -------------- */
  const saveToGitHubMutation = useMutation({
    mutationFn: async (data: {
      repo: string;
      path: string;
      content: string;
      message: string;
    }) => {
      const response = await fetch("/api/github-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github-folders", githubRepo]
      });
      queryClient.invalidateQueries({
        queryKey: ["github-tree", githubRepo]
      });

      const ghUrl = `https://github.com/${githubUser?.login}/${githubRepo}/blob/main/${variables.path}`;
      setSaveSuccess(ghUrl);

      toast.success("File saved to GitHub!");

      setTimeout(() => {
        setShowSave(false);
        resetSaveDialog();
      }, 3000);
    },
    onError: (e: any) =>
      toast.error(`Failed to save: ${e.message}`)
  });

  /* -------------- file-list handlers ---------------------- */
  const createFile = () => {
    const trimmed = newName.trim();
    const genericErr = fileErr(trimmed, newLang);
    if (genericErr) return setErr(genericErr);
    const specificErr = validateFileName(trimmed, newLang);
    if (specificErr) return setErr(specificErr);

    addTab({
      name: trimmed,
      language: newLang,
      code: cfg(newLang).defaultCode
    });
    setShowNew(false);
    setNewName("");
    setErr(null);
    toast.success("New file created!");
  };

  const rename = () => {
    const t = tabs.find(t => t.id === target);
    if (!t) return;
    const trimmed = newName.trim();
    const genericErr = fileErr(trimmed, t.language);
    if (genericErr) return setErr(genericErr);
    const specificErr = validateFileName(trimmed, t.language);
    if (specificErr) return setErr(specificErr);

    updateTab(target, { name: trimmed });
    setShowRename(false);
    setNewName("");
    setErr(null);
    toast.success("File renamed!");
  };

  const changeLanguage = () => {
    updateTab(target, {
      language: newLang,
      name: cfg(newLang).filename,
      code: cfg(newLang).defaultCode
    });
    setShowLang(false);
    toast.success("Language changed!");
  };

  /* ------------------ clipboard --------------------------- */
  const handleCopy = async () => {
    if (!activeTab?.code) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(activeTab.code);
      setCopied(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    } finally {
      setCopying(false);
    }
  };

  /* ------------------ save dialog helpers ---------------- */
  const saveToGitHub = () => {
    if (!activeTab || !githubRepo) return;

    const fileName = (saveName || activeTab.name).trim();
    if (!fileName) {
      toast.error("Filename required");
      return;
    }

    const nameValidation = validateFileName(fileName, activeTab.language);
    if (nameValidation) {
      toast.error(nameValidation);
      return;
    }

    let filePath: string;

    if (isNewFolder) {
      const folder = customFolder.trim();
      if (!folder) {
        toast.error("Folder name required");
        return;
      }
      filePath = `${folder}/${fileName}`;
    } else if (!saveTopic) {
      filePath = fileName;
    } else {
      filePath = `${saveTopic}/${fileName}`;
    }

    saveToGitHubMutation.mutate({
      repo: githubRepo,
      path: filePath,
      content: activeTab.code,
      message: saveTopic
        ? `Add ${saveTopic} solution: ${fileName}`
        : `Add solution: ${fileName}`
    });
  };

  const resetSaveDialog = () => {
    setSaveTopic("");
    setIsNewFolder(false);
    setCustom("");
    setSaveName("");
    setSaveSuccess(null);
  };

  const openSaveDialog = () => {
    setSaveName(activeTab?.name ?? "");
    setSaveSuccess(null);
    setShowSave(true);
  };

  /* ──────────────────────────────────────────────────────── */
  /*                       ENHANCED JSX                       */
  /* ──────────────────────────────────────────────────────── */

  return (
    <TooltipProvider>
      {/* ===== MODERN TABS HEADER BAR ===== */}
      <div className="border-b bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-sm">
        <div className="flex items-center h-12 px-4">
          {/* === LEFT: Enhanced File Tabs + Dropdown === */}
          <div className="flex items-center gap-2 flex-1 min-w-0">

            {/* Horizontal Tab Pills (for quick switching) */}
            <div className="flex items-center gap-4 min-w-0 ">
              <div className="flex items-center gap-4 py-2">
                {tabs
                  .filter(tab => tab.id === activeTabId)
                  .map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTabId(tab.id)}
                        className={cn(
                          "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-0  whitespace-nowrap",
                          isActive
                            ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          isActive ? "bg-primary" : "bg-muted-foreground/40"
                        )} />
                        <span >{tab.name}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              onClick={(e) => e.stopPropagation()}
                              tabIndex={0}
                              role="button"
                              aria-label="Tab actions"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" side="right">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setTarget(tab.id);
                                setNewName(tab.name);
                                setErr(null);
                                setShowRename(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-3 w-3" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setTarget(tab.id);
                                setNewLang(tab.language);
                                setShowLang(true);
                              }}
                            >
                              <Code className="mr-2 h-3 w-3" /> Language
                            </DropdownMenuItem>
                            {tabs.length > 1 && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTab(tab.id);
                                  }}
                                  className="text-red-500 focus:text-red-500"
                                >
                                  <X className="mr-2 h-3 w-3" /> Close
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </button>
                    );
                  })}
              </div>

              {/* All Files Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 border-dashed shrink-0"
                  >
                    <Menu className="w-4 h-4" />
                    {tabs.length > 1 && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                        +{tabs.length - 1}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80 p-0">
                  {/* Clean Header */}
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">All Files</h4>
                        <p className="text-xs text-muted-foreground">
                          {tabs.length} open • Click to switch
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setNewLang(languages[0].name);
                          setNewName(suggested(languages[0].name));
                          setErr(null);
                          setShowNew(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Smooth Scrollable File List */}
                  <div className="max-h-[400px] overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {tabs.map((tab) => {
                        const isActive = tab.id === activeTabId;
                        return (
                          <div
                            key={tab.id}
                            onClick={() => setActiveTabId(tab.id)}
                            className={cn(
                              "group flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-all",
                              isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "hover:bg-accent/50 text-foreground/80 hover:text-foreground"
                            )}
                          >
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              isActive ? "bg-primary" : "bg-muted-foreground/40"
                            )} />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {tab.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 font-medium shrink-0"
                                >
                                  {cfg(tab.language).displayName}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {tab.code.split('\n').length} lines
                              </p>
                            </div>

                            {/* Always Visible Action Buttons */}
                            <div className="flex items-center gap-1 shrink-0">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <span
                                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100 flex items-center justify-center"
                                    onClick={(e) => e.stopPropagation()}
                                    tabIndex={0}
                                    role="button"
                                    aria-label="Tab actions"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" side="right">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTarget(tab.id);
                                      setNewName(tab.name);
                                      setErr(null);
                                      setShowRename(true);
                                    }}
                                  >
                                    <Edit2 className="mr-2 h-3 w-3" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTarget(tab.id);
                                      setNewLang(tab.language);
                                      setShowLang(true);
                                    }}
                                  >
                                    <Code className="mr-2 h-3 w-3" /> Language
                                  </DropdownMenuItem>
                                  {tabs.length > 1 && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeTab(tab.id);
                                        }}
                                        className="text-red-500 focus:text-red-500"
                                      >
                                        <X className="mr-2 h-3 w-3" /> Close
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {tabs.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTab(tab.id);
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clean Footer */}
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground hover:text-foreground h-8"
                      onClick={() => {
                        setNewLang(languages[0].name);
                        setNewName(suggested(languages[0].name));
                        setErr(null);
                        setShowNew(true);
                      }}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      New File
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* === RIGHT: Clean Action Bar === */}
          <div className="flex items-center gap-1 ml-4">
            <GitHubFileBrowser />

            {/* Copy */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!activeTab?.code || copying}
                  onClick={handleCopy}
                  className="h-8 w-8 p-0"
                >
                  {copying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : copied ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Copy code</TooltipContent>
            </Tooltip>

            {/* Format */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isFormatting || !isFormatSupported()}
                    onClick={onFormatCode}
                    className="h-8 w-8 p-0"
                  >
                    {isFormatting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Code2 className="h-3 w-3" />
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isFormatting
                  ? "Formatting..."
                  : !isFormatSupported()
                    ? "Formatting not yet supported for this language"
                    : "Format code"}
              </TooltipContent>
            </Tooltip>

            {/* Documentation */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!activeTab?.code || activeTab.code.trim().length < 20 || isGeneratingDocs}
                  onClick={generateDocumentation}
                  className="h-8 w-8 p-0"
                >
                  {isGeneratingDocs ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Generate docs</TooltipContent>
            </Tooltip>

            {/* Save to GitHub */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!activeTab || !githubRepo || !isConnected}
                    onClick={openSaveDialog}
                    className="h-8 w-8 p-0"
                  >
                    <UploadCloud className="h-3 w-3" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {!isConnected
                  ? "Connect GitHub in Settings"
                  : !githubRepo
                    ? "Select repository in Settings"
                    : !activeTab
                      ? "No file open"
                      : "Save to GitHub"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* All your existing dialogs remain the same... */}
      {/* ── NEW FILE ─────────────────────────────────────────── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Create New File
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* language */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Language</label>
              <Select
                value={newLang}
                onValueChange={v => {
                  setNewLang(v as Language);
                  setNewName(suggested(v as Language));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.name} value={lang.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/60" />
                        {lang.displayName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* filename */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filename</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createFile()}
                placeholder="Enter filename..."
              />
              {err && (
                <div className="mt-2">
                  <ErrorCard
                    error={err}
                    title="Invalid filename"
                    onClear={() => setErr(null)}
                  />
                </div>
              )}
            </div>
            {/* actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button onClick={createFile} disabled={!newName.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── RENAME ───────────────────────────────────────────── */}
      <Dialog open={showRename} onOpenChange={setShowRename}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-4 w-4" /> Rename File
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New filename</label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && rename()}
                placeholder="Enter new filename..."
              />
            </div>
            {err && (
              <ErrorCard
                error={err}
                title="Invalid filename"
                onClear={() => setErr(null)}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowRename(false)}>
                Cancel
              </Button>
              <Button onClick={rename} disabled={!newName.trim()}>
                <Edit2 className="h-4 w-4 mr-1" />
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CHANGE LANGUAGE ──────────────────────────────────── */}
      <Dialog open={showLang} onOpenChange={setShowLang}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-4 w-4" /> Change Language
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select language</label>
              <Select value={newLang} onValueChange={v => setNewLang(v as Language)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.name} value={lang.name}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary/60" />
                        {lang.displayName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Changing language will replace current code with the default template for the selected language.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowLang(false)}>
                Cancel
              </Button>
              <Button onClick={changeLanguage}>
                <Code className="h-4 w-4 mr-1" />
                Change Language
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SAVE TO GITHUB ───────────────────────────────────── */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5" />
              Save to GitHub
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* repo info */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Github className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Repository</p>
                    <p className="text-xs text-muted-foreground">
                      github.com/{githubUser?.login}/{githubRepo}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
            </div>

            {/* choose folder */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Destination folder</label>

              {loadingFolders ? (
                <div className="h-10 flex items-center justify-center border rounded-md bg-muted/20">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading folders...</span>
                </div>
              ) : foldersError ? (
                <ErrorCard
                  error={foldersError.message}
                  title="Failed to load folders"
                  onRetry={refetchFolders}
                  isRetrying={loadingFolders}
                />
              ) : (
                <Select
                  value={isNewFolder ? "new-folder" : (saveTopic || "root")}
                  onValueChange={v => {
                    if (v === "new-folder") {
                      setIsNewFolder(true);
                      setSaveTopic("");
                    } else if (v === "root") {
                      setIsNewFolder(false);
                      setSaveTopic("");
                    } else {
                      setIsNewFolder(false);
                      setSaveTopic(v);
                    }
                  }}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select destination..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {/* Root folder option */}
                    <SelectItem value="root">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">/ (Root folder)</span>
                      </div>
                    </SelectItem>

                    {/* Existing folders */}
                    {processedFolders.length > 0 && (
                      <>
                        <SelectSeparator />
                        {processedFolders.map(f => (
                          <SelectItem key={f.path} value={f.path}>
                            <div
                              style={{ marginLeft: f.depth * 16 }}
                              className="flex items-center gap-2"
                            >
                              {f.hasChildren ? (
                                <FolderOpen className="h-4 w-4 text-primary" />
                              ) : (
                                <Folder className="h-4 w-4 text-primary" />
                              )}
                              <span className="truncate">
                                {f.depth > 0 ? f.path : f.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}

                    {/* New folder option */}
                    <SelectSeparator />
                    <SelectItem value="new-folder">
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-4 w-4 text-emerald-600" />
                        <span className="text-emerald-600">Create new folder</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* new-folder input */}
            {isNewFolder && (
              <div className="space-y-2">
                <label className="text-sm font-medium">New folder name</label>
                <Input
                  value={customFolder}
                  onChange={e => setCustom(e.target.value)}
                  placeholder="e.g., algorithms, data-structures"
                  className="h-10"
                />
              </div>
            )}

            {/* filename */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filename</label>
              <Input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder={activeTab?.name || "solution.java"}
                className="h-10"
              />
            </div>

            {/* path preview */}
            <div className="bg-accent/20 rounded-lg p-4 border border-accent/30">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-accent-foreground/70 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-accent-foreground mb-1">
                    Save path preview
                  </p>
                  <code className="text-xs bg-background/80 px-2 py-1.5 rounded border break-all block">
                    {(() => {
                      if (isNewFolder) {
                        return (customFolder || "new-folder") + "/" + (saveName || activeTab?.name || "filename");
                      } else if (!saveTopic) {
                        return saveName || activeTab?.name || "filename";
                      } else {
                        return saveTopic + "/" + (saveName || activeTab?.name || "filename");
                      }
                    })()}
                  </code>
                </div>
              </div>
            </div>

            {/* success message */}
            {saveSuccess && (
              <Card className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3">
                        File saved successfully to GitHub!
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700"
                        onClick={() => window.open(saveSuccess!, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        View on GitHub
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* error message */}
            {saveToGitHubMutation.isError && (
              <ErrorCard
                error={saveToGitHubMutation.error?.message || "Save failed"}
                title="Failed to save file"
                onRetry={saveToGitHub}
                onClear={saveToGitHubMutation.reset}
                isRetrying={saveToGitHubMutation.isPending}
              />
            )}

            {/* actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" />
                <span>
                  {(activeTab?.code.split("\n").length || 0)} lines • {(activeTab?.code.length || 0)} characters
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSave(false)}
                  disabled={saveToGitHubMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveToGitHub}
                  disabled={
                    saveToGitHubMutation.isPending ||
                    !saveName.trim() ||
                    (isNewFolder && !customFolder.trim()) ||
                    !!saveSuccess
                  }
                >
                  {saveToGitHubMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Save to GitHub
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

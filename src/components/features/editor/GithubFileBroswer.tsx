"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Folder, File, ChevronLeft, ChevronRight, Home, Download,
    Loader2, AlertCircle, Github, Search, RefreshCw, Filter, X,
    FileText, FileCode, Database, Archive, Image, FolderOpen
} from "lucide-react";
import { useEditorStore, languages, Language, getLanguageConfig } from "@/components/features/editor/editorStore";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCredentialsStore } from "@/components/root/credentialsStore";

interface GitHubFile {
    path: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
}

interface FileItem {
    name: string;
    path: string;
    type: "blob" | "tree";
    size?: number;
    sha: string;
    language?: Language;
    isSupported: boolean;
}

// Professional file type icon mapping
const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();

    const iconMap: Record<string, any> = {
        'js': FileCode, 'jsx': FileCode, 'ts': FileCode, 'tsx': FileCode,
        'py': FileCode, 'java': FileCode, 'cpp': FileCode, 'c': FileCode, 'go': FileCode,
        'json': Database, 'yaml': Database, 'yml': Database,
        'md': FileText, 'txt': FileText, 'readme': FileText,
        'png': Image, 'jpg': Image, 'jpeg': Image, 'gif': Image, 'svg': Image,
        'zip': Archive, 'tar': Archive, 'gz': Archive,
    };

    return iconMap[ext || ''] || File;
};

export default function GitHubFileBrowser() {
    // Use correct stores
    const { addTab } = useEditorStore();
    const { githubUser, githubRepo, isConnected } = useCredentialsStore();
    const queryClient = useQueryClient();

    // State management
    const [open, setOpen] = useState(false);
    const [currentPath, setCurrentPath] = useState("");
    const [navigationStack, setNavigationStack] = useState<string[]>([""]);
    const [stackIndex, setStackIndex] = useState(0);
    const [importing, setImporting] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showOnlySupported, setShowOnlySupported] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);

    // Get file language and support check
    const getFileLanguage = useCallback((filename: string): Language | null => {
        const ext = filename.split('.').pop()?.toLowerCase();
        return languages.find(lang =>
            lang.extension === ext || lang.filename.endsWith(`.${ext}`)
        )?.name || null;
    }, []);

    const isFileSupported = useCallback((filename: string) => {
        return getFileLanguage(filename) !== null;
    }, [getFileLanguage]);

    // React Query for fetching repository tree
    const {
        data: repoData,
        isLoading: loading,
        error,
        refetch: fetchRepoTree,
        isRefetching
    } = useQuery({
        queryKey: ['github-tree', githubRepo],
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
                let errorMessage = errorData.error || "Failed to fetch repository tree";

                if (response.status === 401) {
                    errorMessage = "Please sign in with GitHub again.";
                } else if (response.status === 403) {
                    errorMessage = "Access denied. Check repository permissions.";
                } else if (response.status === 404) {
                    errorMessage = "Repository not found. Verify the repository name.";
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data.files || [];
        },
        enabled: !!(githubRepo && isConnected && open),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
            // Don't retry on auth errors
            if (error.message.includes('sign in') ||
                error.message.includes('Access denied')) {
                return false;
            }
            return failureCount < 2;
        }
    });

    const allFiles: GitHubFile[] = repoData || [];

    // Navigation functions
    const navigateToPath = useCallback((newPath: string) => {
        if (newPath === currentPath) return;

        const newStack = navigationStack.slice(0, stackIndex + 1);
        newStack.push(newPath);
        setNavigationStack(newStack);
        setStackIndex(newStack.length - 1);
        setCurrentPath(newPath);
        setIsSearchMode(false);
        setSearchTerm("");
    }, [currentPath, navigationStack, stackIndex]);

    const navigateBack = useCallback(() => {
        if (stackIndex > 0) {
            const newIndex = stackIndex - 1;
            setStackIndex(newIndex);
            setCurrentPath(navigationStack[newIndex]);
            setIsSearchMode(false);
            setSearchTerm("");
        }
    }, [stackIndex, navigationStack]);

    const navigateForward = useCallback(() => {
        if (stackIndex < navigationStack.length - 1) {
            const newIndex = stackIndex + 1;
            setStackIndex(newIndex);
            setCurrentPath(navigationStack[newIndex]);
            setIsSearchMode(false);
            setSearchTerm("");
        }
    }, [stackIndex, navigationStack]);

    const navigateToRoot = useCallback(() => {
        navigateToPath("");
    }, [navigateToPath]);

    // Current directory items
    const currentDirectoryItems = useMemo((): FileItem[] => {
        if (!allFiles.length || isSearchMode) return [];

        const items = new Map<string, FileItem>();

        for (const file of allFiles) {
            let relativePath: string;

            if (!currentPath) {
                relativePath = file.path;
            } else {
                if (!file.path.startsWith(currentPath + "/")) continue;
                relativePath = file.path.substring(currentPath.length + 1);
            }

            if (!relativePath) continue;

            const segments = relativePath.split('/');
            const itemName = segments[0];

            if (items.has(itemName)) continue;

            const itemPath = currentPath ? `${currentPath}/${itemName}` : itemName;
            const isDirectory = segments.length > 1 || file.type === "tree";
            const language = isDirectory ? null : getFileLanguage(itemName);

            items.set(itemName, {
                name: itemName,
                path: itemPath,
                type: isDirectory ? "tree" : "blob",
                size: file.size,
                sha: file.sha,
                language: language || undefined,
                isSupported: isDirectory || isFileSupported(itemName)
            });
        }

        return Array.from(items.values());
    }, [allFiles, currentPath, isSearchMode, getFileLanguage, isFileSupported]);

    // Global search results
    const searchResults = useMemo((): FileItem[] => {
        if (!searchTerm.trim() || !allFiles.length) return [];

        const searchLower = searchTerm.toLowerCase();
        const results: FileItem[] = [];

        for (const file of allFiles) {
            const fileName = file.path.split('/').pop() || file.path;

            if (fileName.toLowerCase().includes(searchLower) ||
                file.path.toLowerCase().includes(searchLower)) {

                const language = file.type === "blob" ? getFileLanguage(fileName) : undefined;

                results.push({
                    name: fileName,
                    path: file.path,
                    type: file.type,
                    size: file.size,
                    sha: file.sha,
                    language: language || undefined,
                    isSupported: file.type === "tree" || isFileSupported(fileName)
                });
            }
        }

        return results;
    }, [searchTerm, allFiles, getFileLanguage, isFileSupported]);

    // Filtered items
    const filteredItems = useMemo(() => {
        let items = isSearchMode ? searchResults : currentDirectoryItems;

        if (showOnlySupported) {
            items = items.filter(item => item.isSupported);
        }

        return items.sort((a, b) => {
            if (a.type === "tree" && b.type === "blob") return -1;
            if (a.type === "blob" && b.type === "tree") return 1;
            return a.name.localeCompare(b.name);
        });
    }, [isSearchMode, searchResults, currentDirectoryItems, showOnlySupported]);

    // Search handling
    const handleSearch = useCallback((value: string) => {
        setSearchTerm(value);
        setIsSearchMode(!!value.trim());
    }, []);

    // Highlight search matches
    const highlightSearchMatch = useCallback((text: string, search: string) => {
        if (!search.trim() || !isSearchMode) return text;

        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);

        return (
            <>
                {parts.map((part, i) =>
                    regex.test(part) ? (
                        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 px-0.5 rounded font-medium">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    }, [isSearchMode]);

    // Import file with updated NextAuth approach
    const importFile = useCallback(async (item: FileItem) => {
        if (!githubRepo || item.type !== 'blob' || !item.language) return;

        setImporting(item.path);

        try {
            const response = await fetch("/api/github-file", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    repo: githubRepo,
                    path: item.path
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch file content");
            }

            addTab({
                name: item.name,
                language: item.language,
                code: data.content
            });

            setOpen(false);
            toast.success(`✅ Imported ${item.name} successfully!`, {
                style: {
                    background: "hsl(var(--background))",
                    color: "#22c55e", // green-500
                    border: "1px solid #22c55e"
                }
            });

        } catch (error: any) {
            console.error("Import error:", error);
            toast.error(`❌ ${error.message}`, {
                style: {
                    background: "hsl(var(--background))",
                    color: "#ef4444", // red-500
                    border: "1px solid #ef4444",
                    borderRadius: "8px"
                }
            });
        } finally {
            setImporting(null);
        }
    }, [githubRepo, addTab]);

    // Breadcrumbs
    const breadcrumbs = useMemo(() => {
        if (isSearchMode) return [{ name: "Search Results", path: "search" }];
        if (!currentPath) return [{ name: "Root", path: "" }];

        const parts = currentPath.split('/');
        const crumbs = [{ name: "Root", path: "" }];

        let pathBuilder = "";
        for (const part of parts) {
            pathBuilder = pathBuilder ? `${pathBuilder}/${part}` : part;
            crumbs.push({ name: part, path: pathBuilder });
        }

        return crumbs;
    }, [currentPath, isSearchMode]);

    // Handle dialog open
    const handleOpen = useCallback((isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            // Reset state when opening
            setCurrentPath("");
            setNavigationStack([""]);
            setStackIndex(0);
            setSearchTerm("");
            setIsSearchMode(false);
        }
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;

            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                navigateBack();
            }
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                navigateForward();
            }
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                navigateToRoot();
            }
            if (e.key === 'Escape') {
                if (isSearchMode) {
                    handleSearch("");
                } else {
                    setOpen(false);
                }
            }
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                searchInput?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, navigateBack, navigateForward, navigateToRoot, isSearchMode, handleSearch]);

    // Stats
    const stats = useMemo(() => {
        const totalFiles = allFiles.filter(f => f.type === 'blob').length;
        const totalFolders = allFiles.filter(f => f.type === 'tree').length;
        const supportedFiles = allFiles.filter(f => f.type === 'blob' && isFileSupported(f.path.split('/').pop() || '')).length;

        return { totalFiles, totalFolders, supportedFiles };
    }, [allFiles, isFileSupported]);

    // Check if GitHub is connected
    if (!isConnected || !githubRepo) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <Button variant="ghost" size="sm" disabled className="h-8 w-8 p-0 opacity-50">
                                <Download className="h-3 w-3" />
                            </Button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        {!isConnected ? "Connect GitHub in Settings"
                            : !githubRepo ? "Select repository in Settings"
                                : "Import from GitHub"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Dialog open={open} onOpenChange={handleOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <Download className="h-3 w-3" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Import from GitHub
                    </TooltipContent>
                </Tooltip>

                <DialogContent className="min-w-[min(95dvw,900px)] max-w-[900px] h-[90vh] flex flex-col p-0">
                    {/* Professional Header */}
                    <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-background to-muted/30">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <Github className="h-5 w-5 text-primary" />
                                    <span className="font-semibold text-lg">Import from</span>
                                </div>
                                <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                                    {githubUser?.login}/{githubRepo}
                                </Badge>
                            </DialogTitle>

                            {/* Professional Stats */}
                            {!loading && allFiles.length > 0 && (
                                <div className="flex items-center gap-6 text-sm text-muted-foreground mr-10">
                                    <div className="flex items-center gap-1.5">
                                        <File className="h-3.5 w-3.5" />
                                        <span className="font-medium">{stats.totalFiles}</span>
                                        <span className="text-xs">files</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Folder className="h-3.5 w-3.5" />
                                        <span className="font-medium">{stats.totalFolders}</span>
                                        <span className="text-xs">folders</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <FileCode className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                        <span className="font-medium text-green-600 dark:text-green-400">{stats.supportedFiles}</span>
                                        <span className="text-xs">supported</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Enhanced Search Bar */}
                    <div className="px-6 py-4 border-b bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search all files and folders... (Ctrl+F)"
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-10 pr-10 h-10 text-sm bg-background border-2 focus:border-primary/50"
                                />
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSearch("")}
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-destructive/10"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <Button
                                variant={showOnlySupported ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowOnlySupported(!showOnlySupported)}
                                className="gap-2 h-10 px-4 font-medium transition-all"
                            >
                                <Filter className="h-4 w-4" />
                                Supported Only
                                {showOnlySupported && (
                                    <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs">
                                        {filteredItems.length}
                                    </Badge>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    fetchRepoTree();
                                    toast.success("Repository refreshed!");
                                }}
                                disabled={loading || isRefetching}
                                className="gap-2 h-10 px-4 transition-all"
                            >
                                <RefreshCw className={cn("h-4 w-4", (loading || isRefetching) && "animate-spin")} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Professional Navigation */}
                    {!isSearchMode && (
                        <div className="px-6 py-3 border-b">
                            <div className="flex items-center gap-4">
                                {/* Navigation Controls */}
                                <div className="flex items-center bg-background border rounded-lg shadow-sm">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={navigateBack}
                                        disabled={stackIndex <= 0}
                                        className="h-9 px-3 rounded-r-none border-r hover:bg-accent"
                                        title="Go back (Alt+←)"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={navigateForward}
                                        disabled={stackIndex >= navigationStack.length - 1}
                                        className="h-9 px-3 rounded-none border-r hover:bg-accent"
                                        title="Go forward (Alt+→)"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={navigateToRoot}
                                        disabled={!currentPath}
                                        className="h-9 px-3 rounded-l-none hover:bg-accent"
                                        title="Go to root (Ctrl+H)"
                                    >
                                        <Home className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Separator orientation="vertical" className="h-6" />

                                {/* Enhanced Breadcrumbs */}
                                <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                                    {breadcrumbs.map((crumb, index) => (
                                        <div key={index} className="flex items-center gap-2 shrink-0">
                                            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => crumb.path !== "search" && navigateToPath(crumb.path)}
                                                className={cn(
                                                    "h-8 px-3 text-sm font-medium rounded-md transition-all",
                                                    crumb.path === currentPath || crumb.path === "search"
                                                        ? 'bg-primary/10 text-primary font-semibold'
                                                        : 'hover:bg-accent hover:text-accent-foreground'
                                                )}
                                                disabled={crumb.path === currentPath || crumb.path === "search"}
                                            >
                                                {index === 0 && <Home className="h-3 w-3 mr-1.5" />}
                                                {crumb.name}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search Results Header */}
                    {isSearchMode && searchResults.length > 0 && (
                        <div className="px-6 py-3 border-b bg-blue-50 dark:bg-blue-950/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Search Results for "{searchTerm}"
                                    </span>
                                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 border-blue-300">
                                        {filteredItems.length} found
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center space-y-4">
                                    <div className="relative">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Loading repository...</p>
                                        <p className="text-xs text-muted-foreground">Fetching file structure from GitHub</p>
                                    </div>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="p-6">
                                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <AlertDescription className="text-sm font-medium text-red-500 dark:text-red-400">
                                        {error.message}
                                    </AlertDescription>
                                </Alert>
                            </div>
                        ) : (
                            <ScrollArea className="h-full">
                                {filteredItems.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center space-y-4 max-w-md">
                                            <div className="text-6xl opacity-60">
                                                {isSearchMode ? "🔍" : "📁"}
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-semibold">
                                                    {isSearchMode ? "No files found" : "Empty folder"}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {isSearchMode
                                                        ? `No files match "${searchTerm}". Try a different search term.`
                                                        : allFiles.length === 0
                                                            ? "This repository appears to be empty or inaccessible."
                                                            : "This folder doesn't contain any files."}
                                                </p>
                                                {isSearchMode && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleSearch("")}
                                                        className="gap-2 mt-4"
                                                    >
                                                        <X className="h-3 w-3" />
                                                        Clear search
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <div className="space-y-1">
                                            {filteredItems.map((item) => {
                                                const IconComponent = item.type === "tree"
                                                    ? (isSearchMode ? FolderOpen : Folder)
                                                    : getFileIcon(item.name);

                                                return (
                                                    <div
                                                        key={item.path}
                                                        className={cn(
                                                            "group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200",
                                                            "hover:bg-accent/60 hover:shadow-sm border border-transparent hover:border-border/30",
                                                            item.type === "tree" && "hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                                        )}
                                                        onClick={() => {
                                                            if (item.type === "tree") {
                                                                if (isSearchMode) {
                                                                    const folderPath = item.path.substring(0, item.path.lastIndexOf('/'));
                                                                    navigateToPath(folderPath || "");
                                                                } else {
                                                                    navigateToPath(item.path);
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        {/* Professional Icon */}
                                                        <div className="relative">
                                                            <IconComponent
                                                                className={cn(
                                                                    "h-5 w-5 shrink-0 transition-colors",
                                                                    item.type === "tree"
                                                                        ? "text-blue-600 dark:text-blue-400"
                                                                        : item.isSupported
                                                                            ? "text-green-600 dark:text-green-400"
                                                                            : "text-muted-foreground"
                                                                )}
                                                            />
                                                            {item.type === "blob" && item.isSupported && (
                                                                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full ring-1 ring-background"></div>
                                                            )}
                                                        </div>

                                                        {/* File Information */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm truncate">
                                                                    {highlightSearchMatch(item.name, searchTerm)}
                                                                </span>

                                                                {item.language && (
                                                                    <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
                                                                        {getLanguageConfig(item.language).displayName}
                                                                    </Badge>
                                                                )}

                                                                {item.type === "tree" && (
                                                                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                                                                        Folder
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Full path in search mode */}
                                                            {isSearchMode && item.path !== item.name && (
                                                                <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                                                                    {highlightSearchMatch(item.path, searchTerm)}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Professional Import Button */}
                                                        {item.type === "blob" && item.isSupported && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    importFile(item);
                                                                }}
                                                                disabled={importing === item.path}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 px-3 bg-primary hover:bg-primary/90 shadow-sm"
                                                            >
                                                                {importing === item.path ? (
                                                                    <>
                                                                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                                                        <span className="text-xs">Importing...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download className="h-3 w-3 mr-1.5" />
                                                                        <span className="text-xs font-medium">Import</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </ScrollArea>
                        )}
                    </div>

                    {/* Professional Footer */}
                    <div className="px-6 py-3 border-t bg-gradient-to-r from-muted/20 to-background">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-6 text-muted-foreground">
                                <span className="font-medium">
                                    {filteredItems.length} items
                                    {isSearchMode && ' found'}
                                    {showOnlySupported && ' (filtered)'}
                                </span>

                                <div className="flex items-center gap-2 text-xs">
                                    <Badge variant="outline" className="text-xs">
                                        {languages.length} supported types
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                <span>Alt+← →</span>
                                <span>•</span>
                                <span>Ctrl+H</span>
                                <span>•</span>
                                <span>Ctrl+F</span>
                                <span>•</span>
                                <span>Esc</span>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}

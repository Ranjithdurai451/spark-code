// components/SettingsDialog.tsx
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Settings, Type, Hash, Terminal, WrapText, Github,
    Check, LogOut, Loader2, AlertCircle, ExternalLink,
    Info, RefreshCw
} from "lucide-react";
import { useEditorStore } from "@/components/features/editor/editorStore";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24];

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
    updated_at: string;
    permissions?: {
        push: boolean;
        pull: boolean;
        admin: boolean;
    };
}

// Updated token validation for modern GitHub PATs
async function validateGitHubToken(token: string): Promise<{ user: string; scopes: string[] } | null> {
    try {
        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) return null;

        const user = await response.json();
        const scopes = response.headers.get('X-OAuth-Scopes')?.split(', ') || [];

        return { user: user.login, scopes };
    } catch {
        return null;
    }
}

async function fetchUserRepositories(token: string): Promise<GitHubRepo[]> {
    try {
        const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=owner", {
            headers: {
                Authorization: `Bearer ${token}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) throw new Error("Failed to fetch repositories");

        const repos = await response.json();
        return repos.filter((repo: GitHubRepo) =>
            !repo.private || repo.permissions?.push
        );
    } catch {
        return [];
    }
}

export default function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const [githubOpen, setGithubOpen] = useState(false);

    // Editor settings from Zustand store
    const {
        fontSize,
        isVimModeEnabled,
        relativeLineNumbers,
        wordWrap,
        setFontSize,
        toggleVimMode,
        toggleRelativeLineNumbers,
        toggleWordWrap,
        githubToken,
        setGithubToken,
        githubRepo,
        setGithubRepo,
        githubUserName,
        setGithubUserName
    } = useEditorStore();

    // GitHub dialog state
    const [tokenInput, setTokenInput] = useState("");
    const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [isLoadingRepos, setIsLoadingRepos] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [error, setError] = useState("");
    const [tokenStep, setTokenStep] = useState<'input' | 'repos'>('input');
    const [shouldLoadRepos, setShouldLoadRepos] = useState(false);

    // Memoize GitHub connection status for better performance
    const isGitHubConnected = useMemo(() => Boolean(githubUserName && githubToken), [githubUserName, githubToken]);

    // Validate existing token on mount (only if we have inconsistent state)
    useEffect(() => {
        const validateExistingToken = async () => {
            if (githubToken && !githubUserName) {
                setIsInitializing(true);
                const validation = await validateGitHubToken(githubToken);

                if (validation) {
                    setGithubUserName(validation.user);
                } else {
                    // Invalid token, clear everything
                    setGithubToken("");
                    setGithubRepo("");
                    setGithubUserName("");
                }
                setIsInitializing(false);
            }
        };

        validateExistingToken();
    }, [githubToken, githubUserName, setGithubToken, setGithubRepo, setGithubUserName]);

    // Load repositories when needed
    useEffect(() => {
        const loadRepositories = async () => {
            if (shouldLoadRepos && githubToken && repositories.length === 0) {
                setIsLoadingRepos(true);
                try {
                    const repos = await fetchUserRepositories(githubToken);
                    setRepositories(repos);

                    // Auto-select first repository if no repo is selected
                    if (!githubRepo && repos.length > 0) {
                        setGithubRepo(repos[0].name);
                    }
                } catch (error) {
                    console.error('Failed to load repositories:', error);
                } finally {
                    setIsLoadingRepos(false);
                    setShouldLoadRepos(false);
                }
            }
        };

        loadRepositories();
    }, [shouldLoadRepos, githubToken, repositories.length, githubRepo, setGithubRepo]);

    // Handle token submission
    const handleTokenSubmit = useCallback(async () => {
        if (!tokenInput.trim()) return;

        setIsValidating(true);
        setError("");

        try {
            const validation = await validateGitHubToken(tokenInput.trim());

            if (validation) {
                // Token is valid, save it to Zustand store
                setGithubToken(tokenInput.trim());
                setGithubUserName(validation.user);

                // Clear previous data and trigger repo loading
                setRepositories([]);
                setShouldLoadRepos(true);

                setTokenInput("");
                setTokenStep('repos');
            } else {
                setError("Invalid token. Please verify your Personal Access Token and ensure it has proper permissions.");
            }
        } catch (error) {
            setError("Failed to validate token. Please check your connection and try again.");
        } finally {
            setIsValidating(false);
        }
    }, [tokenInput, setGithubToken, setGithubUserName]);

    // Handle repository selection
    const handleRepositoryChange = useCallback((repoName: string) => {
        setGithubRepo(repoName);
    }, [setGithubRepo]);

    // Disconnect GitHub
    const handleDisconnect = useCallback(() => {
        setGithubToken("");
        setGithubRepo("");
        setGithubUserName("");
        setRepositories([]);
        setTokenInput("");
        setError("");
        setTokenStep('input');
        setShouldLoadRepos(false);
        setGithubOpen(false);
    }, [setGithubToken, setGithubRepo, setGithubUserName]);

    // Open GitHub dialog with optimized loading
    const openGitHubDialog = useCallback(() => {
        // Open dialog immediately for instant feedback
        setGithubOpen(true);
        setError("");

        if (isGitHubConnected) {
            setTokenStep('repos');
            // Defer repository loading to next tick for smoother dialog opening
            setTimeout(() => {
                if (repositories.length === 0) {
                    setShouldLoadRepos(true);
                }
            }, 0);
        } else {
            setTokenStep('input');
        }
    }, [isGitHubConnected, repositories.length]);

    // Refresh repositories
    const refreshRepositories = useCallback(() => {
        setRepositories([]);
        setShouldLoadRepos(true);
    }, []);

    // Format date for display
    const formatDate = useCallback((dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }, []);

    // Handle Enter key in token input
    const handleTokenInputKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isValidating && tokenInput.trim()) {
            handleTokenSubmit();
        }
    }, [handleTokenSubmit, isValidating, tokenInput]);

    return (
        <>
            {/* Settings Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                        <Settings className="w-4 h-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Editor Settings
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Font Size */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Type className="w-4 h-4 text-muted-foreground" />
                                <label className="text-sm font-medium">Font Size</label>
                            </div>
                            <Select value={fontSize.toString()} onValueChange={(value) => setFontSize(parseInt(value))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONT_SIZES.map((size) => (
                                        <SelectItem key={size} value={size.toString()}>
                                            {size}px
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Editor Mode */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-muted-foreground" />
                                <label className="text-sm font-medium">Editor Mode</label>
                            </div>
                            <Select
                                value={isVimModeEnabled ? "vim" : "standard"}
                                onValueChange={(value) => {
                                    if (value === "vim" && !isVimModeEnabled) {
                                        toggleVimMode();
                                    } else if (value === "standard" && isVimModeEnabled) {
                                        toggleVimMode();
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="standard">Standard</SelectItem>
                                    <SelectItem value="vim">Vim</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Word Wrap */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <WrapText className="w-4 h-4 text-muted-foreground" />
                                <label className="text-sm font-medium">Word Wrap</label>
                            </div>
                            <Switch
                                checked={wordWrap}
                                onCheckedChange={toggleWordWrap}
                            />
                        </div>

                        {/* Relative Line Numbers */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-muted-foreground" />
                                <label className="text-sm font-medium">Relative Line Numbers</label>
                            </div>
                            <Switch
                                checked={relativeLineNumbers}
                                onCheckedChange={toggleRelativeLineNumbers}
                            />
                        </div>

                        {/* GitHub Integration */}
                        <div className="border-t pt-6 space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Github className="w-4 h-4 text-muted-foreground" />
                                        <label className="text-sm font-medium">GitHub Integration</label>
                                        {isInitializing && (
                                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                                        )}
                                    </div>
                                    <Button
                                        variant={isGitHubConnected ? "outline" : "default"}
                                        size="sm"
                                        onClick={openGitHubDialog}
                                        className="gap-2"
                                        disabled={isInitializing}
                                    >
                                        <Github className="w-3 h-3" />
                                        {isGitHubConnected ? "Manage" : "Connect"}
                                    </Button>
                                </div>

                                {isGitHubConnected ? (
                                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-600" />
                                                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                                    Connected as @{githubUserName}
                                                </span>
                                            </div>
                                        </div>
                                        {githubRepo && (
                                            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
                                                <span>Repository:</span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {githubRepo}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground">
                                        Connect your GitHub account to save files directly to your repositories.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* GitHub Connection Dialog */}
            <Dialog open={githubOpen} onOpenChange={setGithubOpen}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Github className="w-5 h-5" />
                            {githubUserName ? `GitHub - @${githubUserName}` : "Connect to GitHub"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {tokenStep === 'input' ? (
                            <>
                                {/* Token Instructions */}
                                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
                                    <Info className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                                        <div className="space-y-2">
                                            <p className="font-medium">Setup Instructions:</p>
                                            <ol className="text-xs space-y-1 ml-4 list-decimal">
                                                <li>Visit GitHub's Personal Access Token page</li>
                                                <li>Click "Generate new token" → "Fine-grained personal access token"</li>
                                                <li>
                                                    <strong>Important:</strong> When setting permissions, select only the repositories you want to interact with, and grant <strong>"Contents: Read and write"</strong> access.
                                                </li>
                                                <li>Copy the generated token and paste it below</li>
                                            </ol>
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                {/* Token Input */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Personal Access Token</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs gap-1 h-6"
                                            onClick={() => window.open('https://github.com/settings/personal-access-tokens', '_blank')}
                                        >
                                            Create Token <ExternalLink className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="github_pat_xxxxxxxxxxxxxxxxxx..."
                                        value={tokenInput}
                                        onChange={(e) => setTokenInput(e.target.value)}
                                        onKeyDown={handleTokenInputKeyDown}
                                        className="font-mono text-sm"
                                        disabled={isValidating}
                                    />
                                </div>

                                {error && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setGithubOpen(false)}
                                        disabled={isValidating}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleTokenSubmit}
                                        disabled={!tokenInput.trim() || isValidating}
                                    >
                                        {isValidating ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Validating...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Connect
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Repository Selection */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Select Repository</label>
                                            <p className="text-xs text-muted-foreground">
                                                Choose where you want to save your code files.
                                            </p>
                                        </div>
                                        {repositories.length > 0 && !isLoadingRepos && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={refreshRepositories}
                                                className="gap-1 text-xs h-7"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                Refresh
                                            </Button>
                                        )}
                                    </div>

                                    {isLoadingRepos ? (
                                        <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/20">
                                            <div className="text-center space-y-2">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                                <p className="text-sm text-muted-foreground">Loading your repositories...</p>
                                                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                                            </div>
                                        </div>
                                    ) : repositories.length > 0 ? (
                                        <>
                                            <Select value={githubRepo} onValueChange={handleRepositoryChange}>
                                                <SelectTrigger className="w-full min-h-16">
                                                    <SelectValue placeholder="Choose a repository..." />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {repositories.map((repo) => (
                                                        <SelectItem key={repo.id} value={repo.name} className="py-3 px-3">
                                                            <div className="flex flex-col gap-1 w-full min-w-0">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="font-medium text-sm truncate flex-1 min-w-0">
                                                                        {repo.name}
                                                                    </span>
                                                                    {repo.private && (
                                                                        <Badge variant="secondary" className="text-xs shrink-0">
                                                                            Private
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Updated {formatDate(repo.updated_at)}
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            {githubRepo && (
                                                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                                                    <Check className="h-4 w-4 text-green-600" />
                                                    <AlertDescription className="text-green-800 dark:text-green-200">
                                                        Files will be saved to{' '}
                                                        <code className="bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-xs break-all">
                                                            github.com/{githubUserName}/{githubRepo}
                                                        </code>
                                                    </AlertDescription>
                                                </Alert>
                                            )}
                                        </>
                                    ) : (
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="space-y-2">
                                                <p>No accessible repositories found.</p>
                                                <p className="text-xs">Make sure your token has "Contents: Read and write" permissions and you have repositories in your account.</p>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                <div className="flex justify-between pt-4">
                                    <Button
                                        variant="destructive"
                                        onClick={handleDisconnect}
                                        className="gap-2"
                                        disabled={isLoadingRepos}
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Disconnect
                                    </Button>
                                    <Button
                                        onClick={() => setGithubOpen(false)}
                                        disabled={isLoadingRepos}
                                    >
                                        {repositories.length === 0 && !isLoadingRepos ? "Close" : "Done"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

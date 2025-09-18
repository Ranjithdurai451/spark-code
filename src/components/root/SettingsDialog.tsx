"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  Type,
  Hash,
  Terminal,
  WrapText,
  Github,
  Check,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { useEditorStore } from "@/components/features/editor/editorStore";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useCredentialsStore } from "./credentialsStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const FONT_SIZES = [12, 14, 16, 18, 20, 22, 24];

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
  description: string | null;
  permissions?: {
    push: boolean;
    pull: boolean;
    admin: boolean;
  };
}

// SECURE: Use server-side API instead of client-side GitHub calls
async function fetchRepositories(): Promise<GitHubRepo[]> {
  console.log("📡 Fetching repositories via secure API...");
  const response = await fetch("/api/github-repos");

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Not authenticated");
    }
    throw new Error("Failed to fetch repositories");
  }

  const repos = await response.json();
  console.log(`✅ Received ${repos.length} repositories from API`);
  return repos;
}

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SettingsDialog({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: SettingsDialogProps = {}) {
  const { data: session, status } = useSession();
  const [internalOpen, setInternalOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange ? externalOnOpenChange : setInternalOpen;

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
  } = useEditorStore();

  // Enhanced credentials store
  const {
    githubUser,
    setGithubUser,
    githubRepo,
    setGithubRepo,
    isConnected,
    setIsConnected,
    geminiApiKey,
    judge0ApiKey,
    setGeminiApiKey,
    setJudge0ApiKey,
    clear,
  } = useCredentialsStore();

  const isGitHubConnected = useMemo(
    () => Boolean(session?.user && isConnected),
    [session?.user, isConnected],
  );

  const {
    data: repositories = [],
    isLoading: isLoadingRepos,
    error: repoQueryError,
    refetch: refreshRepositories,
    isRefetching,
  } = useQuery({
    queryKey: ["github-repos"],
    queryFn: fetchRepositories,
    enabled: isGitHubConnected,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Convert query error to string for UI
  const error = repoQueryError
    ? "Failed to load repositories. Please try again."
    : "";

  // Set first repo as default if it has repos and none is selected
  useEffect(() => {
    if (
      isGitHubConnected &&
      !isLoadingRepos &&
      repositories.length > 0 &&
      !githubRepo
    ) {
      setGithubRepo(repositories[0].name);
    }
  }, [
    isGitHubConnected,
    isLoadingRepos,
    repositories,
    githubRepo,
    setGithubRepo,
  ]);

  // AUTO-MIGRATE KEYS: When user successfully signs in to GitHub
  const migrateLocalKeysToSecure = useCallback(async () => {
    // BYOK removed: no key migration
  }, []);

  // HANDLE SESSION: Set user data and migrate keys if needed
  useEffect(() => {
    if (session?.user && status === "authenticated") {
      console.log("👤 Session user detected:", session.user.login);
      const enhancedUser = {
        login: session.user.login || session.user.name || "unknown",
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        avatar_url: session.user.image ?? null,
      };

      // Check if this is a new connection (user wasn't connected before)
      const isNewConnection = !isConnected;

      // Update user and connection status
      setGithubUser(enhancedUser);
      setIsConnected(true);
      setIsSigningIn(false);

      // If this is a new GitHub connection, migrate local keys
      if (isNewConnection) {
        migrateLocalKeysToSecure();
      }
    }
  }, [
    session?.user,
    status,
    isConnected,
    setGithubUser,
    setIsConnected,
    clear,
    migrateLocalKeysToSecure,
  ]);

  // Enhanced GitHub connection handler
  const handleGitHubConnect = useCallback(async () => {
    setIsSigningIn(true);
    try {
      await signIn("github", {
        callbackUrl: window.location.href,
        redirect: true,
      });
    } catch (error) {
      setIsSigningIn(false);
      console.error("GitHub sign-in error:", error);
    }
  }, []);

  // Handle repository selection
  const handleRepositoryChange = useCallback(
    (repoName: string) => {
      setGithubRepo(repoName);
    },
    [setGithubRepo],
  );

  // Enhanced disconnect with loading state
  const handleDisconnect = useCallback(async () => {
    setIsSigningOut(true);
    try {
      clear();
      setGithubOpen(false);
      await signOut({
        callbackUrl: window.location.href,
        redirect: false,
      });
    } catch (error) {
      console.error("Failed to disconnect:", error);
      setIsSigningOut(false);
    }
  }, [clear]);

  // Enhanced dialog opening
  const openGitHubDialog = useCallback(() => {
    if (!isGitHubConnected) {
      handleGitHubConnect();
      return;
    }
    setGithubOpen(true);
  }, [isGitHubConnected, handleGitHubConnect]);

  return (
    <>
      {/* Settings Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="gap-2"
            data-settings-trigger
          >
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
              <Select
                value={fontSize.toString()}
                onValueChange={(value) => setFontSize(parseInt(value))}
              >
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
              <Switch checked={wordWrap} onCheckedChange={toggleWordWrap} />
            </div>

            {/* Relative Line Numbers */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <label className="text-sm font-medium">
                  Relative Line Numbers
                </label>
              </div>
              <Switch
                checked={relativeLineNumbers}
                onCheckedChange={toggleRelativeLineNumbers}
              />
            </div>

            {/* GitHub Integration */}
            <div className="border-t pt-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-medium">
                      GitHub Integration
                    </label>
                    {(status === "loading" || isSigningIn) && (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    variant={isGitHubConnected ? "outline" : "default"}
                    size="sm"
                    onClick={openGitHubDialog}
                    className="gap-2 min-w-[80px]"
                    disabled={status === "loading" || isSigningIn}
                  >
                    {isSigningIn ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Github className="w-3 h-3" />
                    )}
                    {isSigningIn
                      ? "Signing In..."
                      : isGitHubConnected
                        ? "Manage"
                        : "Sign In"}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {isGitHubConnected && githubUser ? (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={githubUser.avatar_url || ""}
                          alt={githubUser.login}
                        />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 shrink-0" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                            @{githubUser.login}
                          </span>
                        </div>
                        {githubUser.name && (
                          <p className="text-xs text-green-700 dark:text-green-300 truncate">
                            {githubUser.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {githubRepo && (
                      <div className="flex items-center gap-2 pt-2 border-t border-green-200 dark:border-green-800">
                        <GitBranch className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-700 dark:text-green-300">
                          Repository:
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {githubRepo}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Sign in to your GitHub account to save files directly to
                    your repositories.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GitHub Management Dialog - Simplified */}
      <Dialog open={githubOpen} onOpenChange={setGithubOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="w-5 h-5" />
              {githubUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage
                      src={githubUser.avatar_url || ""}
                      alt={githubUser.login}
                    />
                    <AvatarFallback>
                      <User className="w-3 h-3" />
                    </AvatarFallback>
                  </Avatar>
                  <span>@{githubUser.login}</span>
                </div>
              ) : (
                "GitHub Integration"
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Repository Selection
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Choose where to save your code files
                  </p>
                </div>
                {repositories.length > 0 && !isLoadingRepos && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refreshRepositories()}
                    className="gap-1 text-xs h-7"
                    disabled={isRefetching}
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${isRefetching ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isLoadingRepos ? (
                <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/20">
                  <div className="text-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Loading repositories...
                    </p>
                  </div>
                </div>
              ) : repositories.length > 0 ? (
                <>
                  <Select
                    value={githubRepo || ""}
                    onValueChange={handleRepositoryChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a repository..." />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.name}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{repo.name}</span>
                            {repo.private && (
                              <Badge
                                variant="secondary"
                                className="text-xs ml-2"
                              >
                                Private
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {githubRepo && githubUser && (
                    <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Files will be saved to{" "}
                        <code className="bg-green-100 dark:bg-green-900 px-1.5 py-0.5 rounded text-xs">
                          github.com/{githubUser.login}/{githubRepo}
                        </code>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No repositories found. Create a repository on GitHub to get
                    started.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="gap-2"
                disabled={isLoadingRepos || isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {isSigningOut ? "Signing Out..." : "Sign Out"}
              </Button>
              <Button
                onClick={() => setGithubOpen(false)}
                disabled={isLoadingRepos || isSigningOut}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

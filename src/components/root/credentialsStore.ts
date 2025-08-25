import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface APIKey {
  value: string;
  isValid: boolean;
  lastValidated?: number;
  storageMode?: "local" | "secure";
}

interface CredentialsState {
  githubUser: GitHubUser | null;
  setGithubUser: (user: GitHubUser | null) => void;

  githubRepo: string | null;
  setGithubRepo: (repo: string | null) => void;

  lastSync: number | null;
  setLastSync: (timestamp: number) => void;

  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  geminiApiKey: APIKey | null;
  judge0ApiKey: APIKey | null;

  setGeminiApiKey: (key: APIKey | null) => void;
  setJudge0ApiKey: (key: APIKey | null) => void;
  clearApiKeys: () => void;
  clear: () => void;

  hasApiKeys: () => boolean;
  isDataStale: () => boolean;

  // NEW: Session sync function
  syncWithSession: (session: any) => void;
}

export const useCredentialsStore = create<CredentialsState>()(
  persist(
    (set, get) => ({
      githubUser: null,
      setGithubUser: (user) =>
        set({
          githubUser: user,
          isConnected: !!user,
          lastSync: user ? Date.now() : null,
        }),

      githubRepo: null,
      setGithubRepo: (repo) => set({ githubRepo: repo }),

      lastSync: null,
      setLastSync: (timestamp) => set({ lastSync: timestamp }),

      isConnected: false,
      setIsConnected: (connected) => set({ isConnected: connected }),

      geminiApiKey: null,
      judge0ApiKey: null,

      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setJudge0ApiKey: (key) => set({ judge0ApiKey: key }),
      clearApiKeys: () => set({ geminiApiKey: null, judge0ApiKey: null }),

      clear: () =>
        set({
          githubUser: null,
          githubRepo: null,
          isConnected: false,
          lastSync: null,
          geminiApiKey: null,
          judge0ApiKey: null,
        }),

      hasApiKeys: () => {
        const state = get();
        return !!(state.geminiApiKey?.isValid && state.judge0ApiKey?.isValid);
      },

      isDataStale: () => {
        const { lastSync } = get();
        if (!lastSync) return true;
        return Date.now() - lastSync > 60 * 60 * 1000;
      },

      // Improved: Sync store with session state
      syncWithSession: (session) => {
        const currentUser = get().githubUser;
        const { geminiApiKey, judge0ApiKey } = get();

        if (!session?.user) {
          // No session user: only clear user-related state, but keep local API keys
          if (currentUser) {
            console.log(
              "🧹 Session expired - clearing user data (keeping local API keys)"
            );
            set({
              githubUser: null,
              githubRepo: null,
              isConnected: false,
              lastSync: null,
              // Do NOT clear geminiApiKey or judge0ApiKey here
            });
          }
          // If secure keys exist, clear them
          if (
            geminiApiKey?.storageMode === "secure" ||
            judge0ApiKey?.storageMode === "secure"
          ) {
            console.log("🚨 No session user - clearing secure keys");
            get().clearApiKeys();
          }
          return;
        }

        const sessionUser = {
          login: session.user.login || session.user.name || "unknown",
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          avatar_url: session.user.image ?? null,
        };

        // Check if user changed
        if (currentUser && currentUser.login !== sessionUser.login) {
          console.log(
            "🔄 User changed - clearing previous user data and keeping local API keys"
          );
          set({
            githubUser: null,
            githubRepo: null,
            isConnected: false,
            lastSync: null,
            // Do NOT clear geminiApiKey or judge0ApiKey here
          });
        }

        // Update with current session user
        get().setGithubUser(sessionUser);
        get().setIsConnected(true);
      },
    }),
    {
      name: "credentials-store",
      partialize: (state) => ({
        githubUser: state.githubUser,
        githubRepo: state.githubRepo,
        lastSync: state.lastSync,
        geminiApiKey: state.geminiApiKey,
        judge0ApiKey: state.judge0ApiKey,
      }),
    }
  )
);

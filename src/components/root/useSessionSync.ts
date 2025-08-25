// hooks/useSessionSync.ts
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useCredentialsStore } from "./credentialsStore";

export function useSessionSync() {
  const { data: session, status } = useSession();
  const syncWithSession = useCredentialsStore((state) => state.syncWithSession);

  useEffect(() => {
    if (status !== "loading") {
      syncWithSession(session);
    }
  }, [session, status, syncWithSession]);

  return { session, status };
}

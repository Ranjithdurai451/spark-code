"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Settings,
  CreditCard,
  LogOut,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SettingsDialog from "./SettingsDialog";

async function fetchCredits(): Promise<{ user: { credits: number } }> {
  const response = await fetch("/api/credits");
  if (!response.ok) {
    throw new Error("Failed to fetch credits");
  }
  return response.json();
}

export default function ProfileDropdown() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {
    data: creditsData,
    isLoading: isLoadingCredits,
    error: creditsError,
    refetch: refetchCredits,
  } = useQuery({
    queryKey: ["credits"],
    queryFn: fetchCredits,
    enabled: status === "authenticated",
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Listen for credits update events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "credits-updated") {
        refetchCredits();
      }
    };

    const handleCreditsUpdate = () => {
      refetchCredits();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("credits-updated", handleCreditsUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("credits-updated", handleCreditsUpdate);
    };
  }, [refetchCredits]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({
        callbackUrl: window.location.href,
        redirect: false,
      });
    } catch (error) {
      console.error("Failed to sign out:", error);
      setIsSigningOut(false);
    }
  };

  const handleCreditsClick = () => {
    router.push("/credits");
  };



  if (status === "loading") {
    return (
      <Button variant="outline" size="icon" disabled>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Avatar className="w-6 h-6">
              <AvatarImage
                src={session?.user?.image || ""}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage
                src={session?.user?.image || ""}
                alt={session?.user?.name || "User"}
              />
              <AvatarFallback>
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">
                {session?.user?.name || "User"}
              </span>
              <span className="text-xs text-muted-foreground">
                @{session?.user?.login}
              </span>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <div className="px-2 py-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Credits</span>
              {isLoadingCredits ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : creditsError ? (
                <AlertCircle className="w-3 h-3 text-destructive" />
              ) : (
                <Badge variant="secondary" className="text-xs">
                  {creditsData?.user?.credits ?? session?.user?.credits ?? 0}
                </Badge>
              )}
            </div>
            {creditsError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Failed to load credits
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleCreditsClick}
            className="cursor-pointer"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Credits & Billing
          </DropdownMenuItem>


          <SettingsDialog />
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-destructive focus:text-destructive"
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 mr-2" />
            )}
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>


    </>
  );
}

"use client";
import { Code2, Target, Loader2 } from "lucide-react";
import SettingsDialog from "./SettingsDialog";
import { useState } from "react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
const Header = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigateToPractice = async () => {
    setIsNavigating(true);

    // Simulate loading time for better UX
    setTimeout(() => {
      router.push('/practice');
    }, 2500);
  };

  return (
    <>
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                SparkCode
              </h1>
            </div>
            <div className="hidden sm:block text-xs text-muted-foreground bg-muted px-2 py-1 rounded border">
              AI-Powered Coding Platform
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Enhanced Practice Mode Button */}
            {/* <Button
              onClick={handleNavigateToPractice}
              disabled={isNavigating}
              className={`
                relative overflow-hidden font-medium shadow-sm hover:shadow-md 
                transition-all duration-200 disabled:opacity-75
                ${isNavigating ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'hover:scale-105'}
              `}
              size="sm"
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-pulse" />
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Practice Mode
                </>
              )}
            </Button> */}

            {/* Settings Dialog */}
            <SettingsDialog />
          </div>
        </div>
      </header>

    </>
  );
};

export default Header;

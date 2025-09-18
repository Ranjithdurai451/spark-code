"use client";
import { Code2 } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown";
import { ThemeSwitcher } from "../features/themes/theme-switcher";
import GitHubStarButton from "@/components/common/GitHubStarButton";
const Header = () => {
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
            <GitHubStarButton />

            <ThemeSwitcher />

            <ProfileDropdown />
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;

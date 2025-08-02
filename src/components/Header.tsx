"use client";
import { Moon, Sun, Code2, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { useEditorStore } from "@/store/editorStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "./ui/dropdown-menu";

const Header = () => {
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useEditorStore();

  const fontSizes = [12, 14, 16, 18, 20, 22, 24];

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SparkEditor
            </h1>
          </div>
          <div className="hidden sm:block text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            Pro Code Editor
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Font Size Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Font Size</DropdownMenuLabel>
              {fontSizes.map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={fontSize === size ? "bg-accent" : ""}
                >
                  {size}px {fontSize === size && "✓"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="gap-2"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {theme === "dark" ? "Light" : "Dark"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

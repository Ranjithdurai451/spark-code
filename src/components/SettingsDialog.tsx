// components/SettingsDialog.tsx
"use client";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import { Settings, Type, Hash, Terminal, WrapText, Palette } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { useTheme } from "next-themes";

export default function SettingsDialog() {
    const [open, setOpen] = useState(false);
    const { theme, setTheme } = useTheme();
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

    const fontSizes = [12, 14, 16, 18, 20, 22, 24];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    {/* <span className="hidden sm:inline">Settings</span> */}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Theme Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Palette className="w-4 h-4 text-muted-foreground" />
                            <label className="text-sm font-medium">Theme</label>
                        </div>
                        <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

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
                                {fontSizes.map((size) => (
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
                                if ((value === "vim") !== isVimModeEnabled) {
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
                </div>
            </DialogContent>
        </Dialog>
    );
}

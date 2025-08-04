"use client";
import { Button } from "@/components/ui/button";
import { Brain, Play, TestTube2 } from "lucide-react";

interface SidePanelTabsProps {
    activePanel: string;
    setActivePanel: (panel: string) => void;
    isAnalyzing: boolean;
    isGeneratingTests: boolean;
    running: boolean;
}

export function SidePanelTabs({
    activePanel,
    setActivePanel,
    isAnalyzing,
    isGeneratingTests,
    running
}: SidePanelTabsProps) {
    const tabs = [
        {
            id: "analysis",
            label: "Analysis",
            icon: Brain,
            isActive: isAnalyzing,
        },
        {
            id: "testcases",
            label: "Tests",
            icon: TestTube2,
            isActive: isGeneratingTests,
        },
        {
            id: "output",
            label: "Output",
            icon: Play,
            isActive: running,
        }
    ];

    return (
        <div className="px-2 py-1 border-b bg-muted/20">
            <div className="flex items-center">
                {tabs.map(({ id, label, icon: Icon, isActive }) => (
                    <Button
                        key={id}
                        variant={activePanel === id ? "default" : "ghost"}
                        size="sm"
                        className="h-7 text-xs font-medium relative px-3 border"
                        onClick={() => setActivePanel(id)}
                    >
                        <Icon className="w-3 h-3 mr-1" />
                        {label}
                        {isActive && (
                            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        )}
                    </Button>
                ))}
            </div>
        </div>
    );
}

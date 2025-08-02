"use client";
import { Button } from "@/components/ui/button";
import { Brain, Play, TestTube2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
            description: "AI code review"
        },
        {
            id: "testcases",
            label: "Test Cases",
            icon: TestTube2,
            isActive: isGeneratingTests,
            description: "Generate tests"
        },
        {
            id: "output",
            label: "Output",
            icon: Play,
            isActive: running,
            description: "Execution results"
        }
    ];

    return (
        <>
            <div className="px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-1">
                    {tabs.map(({ id, label, icon: Icon, isActive, description }) => (
                        <Button
                            key={id}
                            variant={activePanel === id ? "default" : "ghost"}
                            size="sm"
                            className="rounded-lg text-xs font-medium relative"
                            onClick={() => setActivePanel(id)}
                        >
                            <Icon className="w-3 h-3 mr-1.5" />
                            {label}
                            {isActive && (
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                            )}
                        </Button>
                    ))}
                </div>
            </div>
        </>
    );
}

"use client";
import { Button } from "@/components/ui/button";
import { Play, Brain, RotateCcw, StopCircle, TestTube } from "lucide-react";
import { Tab } from "@/components/features/editor/editorStore";

interface SidePanelHeaderProps {
    tab: Tab | undefined;
    isAnalyzing: boolean;
    isGeneratingTests: boolean;
    running: boolean;
    status: string;
    testStatus: string;
    onAnalyze: () => void;
    onGenerateTests: () => void;
    onRun: () => void;
    onStop: () => void;
    onStopTests: () => void;
    onReload: () => void;
    onReloadTests: () => void;
}

export function SidePanelHeader({
    tab,
    isAnalyzing,
    isGeneratingTests,
    running,
    status,
    testStatus,
    onAnalyze,
    onGenerateTests,
    onRun,
    onStop,
    onStopTests,
    onReload,
    onReloadTests
}: SidePanelHeaderProps) {
    return (
        <div className="flex gap-2 flex-wrap">
            <Button
                onClick={isAnalyzing ? onStop : onAnalyze}
                disabled={!tab}
                variant={isAnalyzing ? "destructive" : "default"}
                size="sm"
                className="flex items-center gap-2"
            >
                {isAnalyzing ? (
                    <>
                        <StopCircle size={16} />
                        Stop Analysis
                    </>
                ) : (
                    <>
                        <Brain size={16} />
                        Analyze Code
                    </>
                )}
            </Button>

            <Button
                onClick={isGeneratingTests ? onStopTests : onGenerateTests}
                disabled={!tab}
                variant={isGeneratingTests ? "destructive" : "outline"}
                size="sm"
                className="flex items-center gap-2"
            >
                {isGeneratingTests ? (
                    <>
                        <StopCircle size={16} />
                        Stop Tests
                    </>
                ) : (
                    <>
                        <TestTube size={16} />
                        Generate Tests
                    </>
                )}
            </Button>

            <Button
                onClick={onRun}
                disabled={running || !tab}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2"
            >
                <Play size={16} />
                {running ? "Running..." : "Run Code"}
            </Button>

            {/* {status === 'error' && (
                <Button
                    onClick={onReload}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <RotateCcw size={16} />
                    Retry Analysis
                </Button>
            )}

            {testStatus === 'error' && (
                <Button
                    onClick={onReloadTests}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <RotateCcw size={16} />
                    Retry Tests
                </Button>
            )} */}
        </div>
    );
}

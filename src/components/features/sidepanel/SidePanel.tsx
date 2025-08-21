"use client";
import { Tab, useEditorStore } from "@/components/features/editor/editorStore";
import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
    Brain, TestTube2, Play, ArrowRight,
    CheckCircle, Clock, ChevronLeft, FileText, Activity,
    Sparkles, Target, Rocket
} from "lucide-react";
import { AnalysisPanel } from "./AnalysisPanel";
import { OutputPanel } from "./OutputPanel";
import { TestCasesPanel } from "./TestCasesPanel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ContextMenuSeparator } from "@radix-ui/react-context-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Simplified error parser
// function parseApiError(error: any): { message: string; suggestion?: string; category?: string } {
//     // console.log("error", error);
//     if (!error) return { message: 'An unexpected error occurred' };
//     if (typeof error === 'string') return { message: error };
//     if (error instanceof Error) return { message: error.message };
//     if (typeof error === 'object') {
//         // console.log("Test")
//         // console.log("error", error);
//         const msg = error.message || error.error || 'An unexpected error occurred';
//         return { message: msg, suggestion: error.suggestion, category: error.category };
//     }
//     return { message: 'An unexpected error occurred' };
// }
interface SidePanelProps {
    isVisible: boolean;
    showPanel: () => void;
}

export default function SidePanel({ isVisible, showPanel }: SidePanelProps) {
    const { activeTabId, tabs } = useEditorStore();
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState("");
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<{ message: string; suggestion?: string; category?: string } | null>(null);
    const [testError, setTestError] = useState<{ message: string; suggestion?: string; category?: string } | null>(null);

    var tab: Tab | undefined = tabs.find((item) => item.id == activeTabId);

    // Chat hooks with simple error handling
    const {
        messages, append, isLoading: analysisLoading, stop, status, setMessages
    } = useChat({
        api: '/api/analyze',
        onError: async (error) => {
            const errorContent = JSON.parse(error.message);
            setAnalysisError({
                message: errorContent.error || "An unexpected error occurred",
                suggestion: errorContent.suggestion || "Please try again",
                category: errorContent.category || "error"
            });
        },
        onFinish: (message) => {
            setAnalysisError(null);
        }
    });

    const {
        messages: testMessages, append: appendTest, stop: stopTest,
        reload: reloadTest, status: testStatus, setMessages: setTestMessages, isLoading: testsLoading
    } = useChat({
        api: '/api/generate-tests',
        onError: (error) => {
            const errorContent = JSON.parse(error.message);
            console.log("errorContent", errorContent)
            setTestError({
                message: errorContent.message || "An unexpected error occurred",
                suggestion: errorContent.details || "Please try again",
                category: errorContent.category || "error"
            });
        },
        onFinish: (message) => {
            console.log('Test generation completed:', message);
            setTestError(null); // Clear error on success
        }
    });

    const latestAnalysis = messages.filter(m => m.role === 'assistant').pop();
    const latestTests = testMessages.filter(m => m.role === 'assistant').pop();
    const isAnalyzing = analysisLoading || ['loading', 'streaming', 'submitted', 'in_progress'].includes(status as any);
    const isGeneratingTests = testsLoading || ['loading', 'streaming', 'submitted', 'in_progress'].includes(testStatus as any);



    // Action handlers with better error management
    async function handleAnalyze() {
        if (!tab) {
            alert("Please select a tab to analyze code");
            return;
        }

        setAnalysisError(null); // Clear any previous errors

        const { code, language } = tab;
        setActivePanel("analysis");
        setMessages([]);

        // Client-side validation
        if (!code || code.trim().length < 10) {
            const validationError = {
                message: "Code is too short to analyze",
                suggestion: "Please provide at least 10 characters of code with some logic",
                category: "validation"
            };
            setAnalysisError(validationError);
            return;
        }

        await append({
            role: "user",
            content: `Analyze this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``
        }, { body: { code, language, type: "comprehensive" } });
    }

    async function handleGenerateTests() {
        if (!tab) {
            alert("Please select a tab to generate test cases");
            return;
        }

        setTestError(null); // Clear any previous errors

        const { code, language } = tab;
        setActivePanel("testcases");
        setTestMessages([]);

        if (!code || code.trim().length < 10) {
            const validationError = {
                message: "Code is too short to generate tests",
                suggestion: "Please provide at least 10 characters of code with some logic",
                category: "validation"
            };
            setTestError(validationError);
            return;
        }

        await appendTest({
            role: "user",
            content: `Generate comprehensive test cases for this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``
        }, { body: { code, language, type: "testcases" } });

    }

    async function handleRun() {
        if (!tab) {
            alert("Please select a tab to run code");
            return;
        }
        const { code, language } = tab;
        setRunning(true);
        setOutput("🚀 Running your code...");
        setActivePanel("output");

        try {
            const res = await fetch("/api/execute", {
                method: "POST",
                body: JSON.stringify({ code, language }),
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            setOutput(data.output || data.stderr || data.error || "✅ Code executed successfully with no output");
        } catch (error) {
            setOutput("❌ Error: Failed to execute code");
        } finally {
            setRunning(false);
        }
    }

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (event.altKey && !event.ctrlKey && !event.metaKey) {
                // ## CHANGE: This logic is updated to show the panel if it's not visible ##
                switch (key) {
                    case 'e':
                        event.preventDefault();
                        event.stopPropagation();
                        if (!running && tab) {
                            if (!isVisible) showPanel(); // Show panel if hidden
                            setActivePanel("output");
                            handleRun();
                        }
                        break;
                    case 'a':
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isAnalyzing && tab) {
                            if (!isVisible) showPanel(); // Show panel if hidden
                            setActivePanel("analysis");
                            handleAnalyze();
                        }
                        break;
                    case 't':
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isGeneratingTests && tab) {
                            if (!isVisible) showPanel(); // Show panel if hidden
                            setActivePanel("testcases");
                            handleGenerateTests();
                        }
                        break;
                }
            } else if (key === 'escape') {
                if (activePanel) {
                    event.preventDefault();
                    event.stopPropagation();
                    setActivePanel(null);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [running, isAnalyzing, isGeneratingTests, tab, activePanel, isVisible, showPanel]);

    const clearOutput = () => setOutput("");
    const clearAnalysis = () => {
        setMessages([]);
        setAnalysisError(null);
    };
    const clearTests = () => {
        setTestMessages([]);
        setTestError(null);
    };

    // Enhanced reload functions with better error handling
    const handleReloadAnalysis = async () => {
        if (!tab) {
            alert("Please select a tab to analyze code");
            return;
        }

        setAnalysisError(null); // Clear previous errors

        const { code, language } = tab;

        // Validate before reloading
        if (!code || code.trim().length < 10) {
            const validationError = {
                message: "Code is too short to analyze",
                suggestion: "Please provide at least 10 characters of code with some logic",
                category: "validation"
            };
            setAnalysisError(validationError);
            return;
        }

        setMessages([]);
        await append({
            role: "user",
            content: `Analyze this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``
        }, { body: { code, language, type: "comprehensive" } });

    };

    const handleReloadTests = async () => {
        if (!tab) {
            alert("Please select a tab to generate test cases");
            return;
        }

        setTestError(null); // Clear previous errors

        const { code, language } = tab;

        // Validate before reloading
        if (!code || code.trim().length < 10) {
            const validationError = {
                message: "Code is too short to generate tests",
                suggestion: "Please provide at least 10 characters of code with some logic",
                category: "validation"
            };
            setTestError(validationError);
            return;
        }

        setTestMessages([]);
        await appendTest({
            role: "user",
            content: `Generate comprehensive test cases for this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``
        }, { body: { code, language, type: "testcases" } });
    };

    const actions = [
        {
            id: "analysis",
            title: "Smart Analysis",
            description: "AI-powered code analysis with quality insights and optimization suggestions",
            icon: Brain,
            accentIcon: Sparkles,
            isActive: isAnalyzing,
            hasContent: !!latestAnalysis,
            hasError: !!analysisError,
            onClick: isAnalyzing ? stop : handleAnalyze,
            buttonText: isAnalyzing ? "Stop" : "Analyze",
            shortcut: "Alt+A",
            features: ["Quality Score", "Performance Tips", "Best Practices"],
            beta: false
        },
        {
            id: "testcases",
            title: "Test Generator",
            description: "Generate comprehensive test suites with edge cases and validation",
            icon: TestTube2,
            accentIcon: Target,
            isActive: isGeneratingTests,
            hasContent: !!latestTests,
            hasError: !!testError,
            onClick: isGeneratingTests ? stopTest : handleGenerateTests,
            buttonText: isGeneratingTests ? "Stop" : "Generate",
            shortcut: "Alt+T",
            features: ["Edge Cases", "Input Validation", "Coverage Tests"],
            beta: true
        },
        {
            id: "output",
            title: "Code Execution",
            description: "Execute your code with real-time output and error handling",
            icon: Play,
            accentIcon: Rocket,
            isActive: running,
            hasContent: !!output,
            hasError: false,
            onClick: handleRun,
            buttonText: running ? "Running..." : "Execute",
            shortcut: "Alt+E",
            features: ["Real-time Output", "Error Details", "Debug Info"],
            beta: false
        }
    ];

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="flex-1 overflow-hidden">
                {!activePanel ? (
                    /* Main Dashboard */
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                            <div className="space-y-3">
                                {actions.map((action) => {
                                    const IconComponent = action.icon;
                                    const isHovered = hoveredAction === action.id;

                                    return (
                                        <Card
                                            key={action.id}
                                            className={cn(
                                                "cursor-pointer transition-all duration-200 hover:shadow-md",
                                                action.isActive
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : action.hasError
                                                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                                                        : "border-border hover:border-primary/30",
                                                action.hasContent && !action.isActive && !action.hasError && "bg-muted/20"
                                            )}
                                            onClick={action.onClick}
                                            onMouseEnter={() => setHoveredAction(action.id)}
                                            onMouseLeave={() => setHoveredAction(null)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Icon Section */}
                                                    <div className="relative flex-shrink-0">
                                                        <div className={cn(
                                                            "p-2.5 rounded-lg transition-all duration-200 border",
                                                            action.isActive
                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                : action.hasError
                                                                    ? "bg-red-500 border-red-500 text-white"
                                                                    : "bg-muted/50 border-border text-foreground hover:bg-primary/10"
                                                        )}>
                                                            <IconComponent className="w-4 h-4" />

                                                        </div>

                                                        {/* Status Dot */}
                                                        <div className={cn(
                                                            "absolute -top-1 -right-1 w-3 h-3 rounded-full border border-background flex items-center justify-center",
                                                            action.isActive && "bg-primary animate-pulse",
                                                            action.hasError && !action.isActive && "bg-red-500",
                                                            action.hasContent && !action.isActive && !action.hasError && "bg-green-500",
                                                            !action.hasContent && !action.isActive && !action.hasError && "bg-muted/50 opacity-0 group-hover:opacity-100"
                                                        )}>
                                                            {action.isActive ? (
                                                                <Activity className="w-1.5 h-1.5 text-primary-foreground" />
                                                            ) : action.hasError ? (
                                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                            ) : action.hasContent ? (
                                                                <CheckCircle className="w-1.5 h-1.5 text-white" />
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* Content Section */}
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        {/* Title and Status Row */}
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-semibold text-foreground text-sm leading-tight">
                                                                {action.title}                     {action.beta && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="text-[10px] h-4 px-1 text-yellow-700 border-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 cursor-help"
                                                                                >
                                                                                    Beta
                                                                                </Badge>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>This feature is experimental and may not work for all code inputs.</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                <kbd className={cn(
                                                                    "px-2 py-0.5 rounded text-xs font-mono border transition-colors",
                                                                    isHovered || action.isActive
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-muted text-muted-foreground border-border"
                                                                )}>
                                                                    {action.shortcut}
                                                                </kbd>
                                                                {action.isActive && (
                                                                    <Badge variant="secondary" className="text-xs py-0 h-5">
                                                                        <Activity className="w-2 h-2 mr-1 animate-pulse" />
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                                {action.hasError && !action.isActive && (
                                                                    <Badge variant="destructive" className="text-xs py-0 h-5">
                                                                        Error
                                                                    </Badge>
                                                                )}
                                                                {action.hasContent && !action.isActive && !action.hasError && (
                                                                    <Badge variant="secondary" className="text-xs py-0 h-5 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                                                        <CheckCircle className="w-2 h-2 mr-1" />
                                                                        Ready
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {action.description}
                                                        </p>

                                                        {/* Features */}
                                                        <div className="flex flex-wrap gap-1">
                                                            {action.features.map((feature, i) => (
                                                                <Badge
                                                                    key={i}
                                                                    variant="outline"
                                                                    className="text-xs py-0 px-1.5 h-5 opacity-70 hover:opacity-100 transition-opacity"
                                                                >
                                                                    {feature}
                                                                </Badge>
                                                            ))}
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex items-center justify-between pt-1">
                                                            <Button
                                                                size="sm"
                                                                disabled={!tab}
                                                                className={cn(
                                                                    "h-7 px-3 text-xs transition-all",
                                                                    action.isActive
                                                                        ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                                                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                                                )}
                                                            >
                                                                {action.isActive ? (
                                                                    <>
                                                                        <Clock className="w-3 h-3 mr-1 animate-spin" />
                                                                        {action.buttonText}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <IconComponent className="w-3 h-3 mr-1" />
                                                                        {action.buttonText}
                                                                    </>
                                                                )}
                                                            </Button>

                                                            {(action.hasContent || action.hasError) && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-3 text-xs hover:bg-muted/50 transition-colors"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActivePanel(action.id);
                                                                    }}
                                                                >
                                                                    {action.hasError ? 'View Error' : 'View Results'}
                                                                    <ArrowRight className="w-3 h-3 ml-1" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* No File State */}
                            {!tab && (
                                <Card className="border-dashed border-muted-foreground/30 bg-muted/10 mt-6">
                                    <CardContent className="p-6 text-center space-y-3">
                                        <div className="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-muted-foreground/70" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-foreground">Ready to Assist</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Open a code file to unlock AI-powered features
                                            </p>
                                            <div className="flex items-center justify-center gap-2 pt-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    AI-Powered
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    <Brain className="w-3 h-3 mr-1" />
                                                    Smart Analysis
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    /* Panel View */
                    <div className="h-full flex flex-col">
                        {/* Panel Header */}
                        <div className="px-4 py-3 border-b bg-muted/10 backdrop-blur-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const currentAction = actions.find(a => a.id === activePanel);
                                        const IconComponent = currentAction?.icon || Brain;
                                        return (
                                            <>
                                                <div className={cn(
                                                    "p-2 rounded-lg shadow-sm",
                                                    currentAction?.hasError
                                                        ? "bg-red-500 text-white"
                                                        : "bg-primary text-primary-foreground"
                                                )}>
                                                    <IconComponent className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h2 className="font-semibold text-foreground text-sm">
                                                        {currentAction?.title || 'Results'}
                                                    </h2>
                                                    <p className="text-xs text-muted-foreground">
                                                        {currentAction?.description || 'View your results below'}
                                                    </p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="flex items-center gap-2">
                                    <kbd className="px-2 py-1 bg-muted border rounded text-xs font-mono text-muted-foreground">
                                        Esc
                                    </kbd>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setActivePanel(null)}
                                        className="h-8 px-3 text-xs hover:bg-muted/50"
                                    >
                                        <ChevronLeft className="w-3 h-3 mr-1" />
                                        Back
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Panel Content */}
                        <div className="flex-1 overflow-hidden">
                            {activePanel === "analysis" && (
                                <AnalysisPanel
                                    error={analysisError}
                                    latestAnalysis={latestAnalysis}
                                    isAnalyzing={isAnalyzing}
                                    onClear={clearAnalysis}
                                    onReload={handleReloadAnalysis}
                                    status={status}
                                />
                            )}
                            {activePanel === "testcases" && (
                                <TestCasesPanel
                                    tab={tab}
                                    error={testError}
                                    latestTests={latestTests}
                                    isGeneratingTests={isGeneratingTests}
                                    onClear={clearTests}
                                    onReload={handleReloadTests}
                                    status={testStatus}
                                />
                            )}
                            {activePanel === "output" && (
                                <OutputPanel
                                    output={output}
                                    onClear={clearOutput}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
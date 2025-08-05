"use client";
import { Tab, useEditorStore } from "@/store/editorStore";
import { useState, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import {
    Brain, TestTube2, Play, Code2, ArrowRight,
    CheckCircle, Clock, ChevronLeft, FileText, Activity,
    Sparkles, Target, Shield, Rocket, Command, Zap
} from "lucide-react";
import { AnalysisPanel } from "./panels/AnalysisPanel";
import { OutputPanel } from "./panels/OutputPanel";
import { TestCasesPanel } from "./panels/TestCasesPanel";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

export default function SidePanel() {
    const { activeTabId, tabs } = useEditorStore();
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState("");
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);

    var tab: Tab | undefined = tabs.find((item) => item.id == activeTabId);

    // Chat hooks
    const {
        messages, append, stop, reload, status, error, setMessages
    } = useChat({
        api: '/api/analyze',
        onError: (error) => console.error('Analysis error:', error),
        onFinish: (message) => console.log('Analysis completed:', message)
    });

    const {
        messages: testMessages, append: appendTest, stop: stopTest,
        reload: reloadTest, status: testStatus, error: testError, setMessages: setTestMessages
    } = useChat({
        api: '/api/generate-tests',
        onError: (error) => console.error('Test generation error:', error),
        onFinish: (message) => console.log('Test generation completed:', message)
    });

    const latestAnalysis = messages.filter(m => m.role === 'assistant').pop();
    const latestTests = testMessages.filter(m => m.role === 'assistant').pop();
    const isAnalyzing = status === 'streaming' || status === 'submitted';
    const isGeneratingTests = testStatus === 'streaming' || testStatus === 'submitted';

    // Action handlers
    async function handleAnalyze() {
        if (!tab) {
            alert("Please select a tab to analyze code");
            return;
        }
        const { code, language } = tab;
        setActivePanel("analysis");
        setMessages([]);
        append({
            role: "user",
            content: `Analyze this ${language} code:\n\`\`\`${language}\n${code}\n\`\`\``
        }, { body: { code, language, type: "analysis" } });
    }

    async function handleGenerateTests() {
        if (!tab) {
            alert("Please select a tab to generate test cases");
            return;
        }
        const { code, language } = tab;
        setActivePanel("testcases");
        setTestMessages([]);
        appendTest({
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
                switch (key) {
                    case 'e':
                        event.preventDefault();
                        event.stopPropagation();
                        if (!running && tab) {
                            handleRun();
                        }
                        break;
                    case 'a':
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isAnalyzing && tab) {
                            handleAnalyze();
                        }
                        break;
                    case 't':
                        event.preventDefault();
                        event.stopPropagation();
                        if (!isGeneratingTests && tab) {
                            handleGenerateTests();
                        }
                        break;
                }
            }
            else if (key === 'escape') {
                event.preventDefault();
                event.stopPropagation();
                if (activePanel) {
                    setActivePanel(null);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [running, isAnalyzing, isGeneratingTests, tab, activePanel]);

    const clearOutput = () => setOutput("");
    const clearAnalysis = () => setMessages([]);
    const clearTests = () => setTestMessages([]);

    // Compact actions
    const actions = [
        {
            id: "analysis",
            title: "Smart Analysis",
            description: "AI-powered code analysis with quality insights and optimization suggestions",
            icon: Brain,
            accentIcon: Sparkles,
            isActive: isAnalyzing,
            hasContent: !!latestAnalysis,
            onClick: isAnalyzing ? stop : handleAnalyze,
            buttonText: isAnalyzing ? "Stop" : "Analyze",
            shortcut: "Alt+A",
            features: ["Quality Score", "Performance Tips", "Best Practices"]
        },
        {
            id: "testcases",
            title: "Test Generator",
            description: "Generate comprehensive test suites with edge cases and validation",
            icon: TestTube2,
            accentIcon: Target,
            isActive: isGeneratingTests,
            hasContent: !!latestTests,
            onClick: isGeneratingTests ? stopTest : handleGenerateTests,
            buttonText: isGeneratingTests ? "Stop" : "Generate",
            shortcut: "Alt+T",
            features: ["Edge Cases", "Input Validation", "Coverage Tests"]
        },
        {
            id: "output",
            title: "Code Execution",
            description: "Execute your code with real-time output and error handling",
            icon: Play,
            accentIcon: Rocket,
            isActive: running,
            hasContent: !!output,
            onClick: handleRun,
            buttonText: running ? "Running..." : "Execute",
            shortcut: "Alt+E",
            features: ["Real-time Output", "Error Details", "Debug Info"]
        }
    ];

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="flex-1 overflow-hidden">
                {!activePanel ? (
                    /* Compact Main Dashboard */
                    <ScrollArea className="h-full">
                        <div className="p-4 space-y-4">
                            {/* Compact Header */}
                            {/* <div className="text-center space-y-3 py-2">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-md">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h1 className="text-xl font-bold text-foreground">AI Code Assistant</h1>
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                        Enhance your workflow with AI analysis, testing, and execution
                                    </p>
                                </div>
                            </div> */}

                            {/* Compact Keyboard Shortcuts */}
                            {/* <Card className="bg-muted/20 border border-dashed py-2">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Command className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium text-foreground">Quick Actions</span>
                                        <Badge variant="secondary" className="text-xs">Pro</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {[
                                            { label: "Execute", key: "Alt+E" },
                                            { label: "Analyze", key: "Alt+A" },
                                            { label: "Test Gen", key: "Alt+T" },
                                            { label: "Back", key: "Esc" }
                                        ].map((shortcut, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded bg-background/50 border">
                                                <span className="text-foreground font-medium">{shortcut.label}</span>
                                                <kbd className="px-2 py-0.5 bg-muted border rounded text-xs font-mono text-muted-foreground">
                                                    {shortcut.key}
                                                </kbd>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card> */}

                            {/* Compact Action Cards */}
                            <div className="space-y-3">
                                {/* <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-foreground">Available Actions</h2>
                                    <Badge variant="outline" className="text-xs">
                                        {actions.filter(a => a.hasContent).length}/{actions.length} Complete
                                    </Badge>
                                </div> */}

                                {actions.map((action) => {
                                    const IconComponent = action.icon;
                                    const isHovered = hoveredAction === action.id;

                                    return (
                                        <Card
                                            key={action.id}
                                            className={cn(
                                                "cursor-pointer transition-all duration-200 hover:shadow-md py-6",
                                                action.isActive
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-primary/30",
                                                action.hasContent && !action.isActive && "bg-muted/20"
                                            )}
                                            onClick={action.onClick}
                                            onMouseEnter={() => setHoveredAction(action.id)}
                                            onMouseLeave={() => setHoveredAction(null)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Compact Icon */}
                                                    <div className="relative flex-shrink-0">
                                                        <div className={cn(
                                                            "p-2.5 rounded-lg transition-all duration-200 border",
                                                            action.isActive
                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                : "bg-muted/50 border-border text-foreground hover:bg-primary/10"
                                                        )}>
                                                            <IconComponent className="w-4 h-4" />
                                                        </div>

                                                        {/* Status Dot */}
                                                        <div className={cn(
                                                            "absolute -top-1 -right-1 w-3 h-3 rounded-full border border-background flex items-center justify-center",
                                                            action.isActive && "bg-primary animate-pulse",
                                                            action.hasContent && !action.isActive && "bg-muted-foreground",
                                                            !action.hasContent && !action.isActive && "bg-muted/50 opacity-0 group-hover:opacity-100"
                                                        )}>
                                                            {action.isActive ? (
                                                                <Activity className="w-1.5 h-1.5 text-primary-foreground" />
                                                            ) : action.hasContent ? (
                                                                <CheckCircle className="w-1.5 h-1.5 text-background" />
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* Compact Content */}
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        {/* Title and Shortcut */}
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-semibold text-foreground text-sm leading-tight">
                                                                {action.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                <kbd className={cn(
                                                                    "px-2 py-0.5 rounded text-xs font-mono border",
                                                                    isHovered || action.isActive
                                                                        ? "bg-primary text-primary-foreground border-primary"
                                                                        : "bg-muted text-muted-foreground border-border"
                                                                )}>
                                                                    {action.shortcut}
                                                                </kbd>
                                                                {action.isActive && (
                                                                    <Badge variant="secondary" className="text-xs py-0">
                                                                        <Activity className="w-2 h-2 mr-1 animate-pulse" />
                                                                        Active
                                                                    </Badge>
                                                                )}
                                                                {action.hasContent && !action.isActive && (
                                                                    <Badge variant="secondary" className="text-xs py-0">
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
                                                                    className="text-xs py-0 px-1.5 h-5"
                                                                >
                                                                    {feature}
                                                                </Badge>
                                                            ))}
                                                        </div>

                                                        {/* Compact Action Buttons */}
                                                        <div className="flex items-center justify-between pt-1">
                                                            <Button
                                                                size="sm"
                                                                disabled={!tab}
                                                                className={cn(
                                                                    "h-7 px-3 text-xs",
                                                                    action.isActive
                                                                        ? "bg-destructive hover:bg-destructive/90"
                                                                        : "bg-primary hover:bg-primary/90"
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

                                                            {action.hasContent && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-3 text-xs hover:bg-muted/50"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActivePanel(action.id);
                                                                    }}
                                                                >
                                                                    View Results
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

                            {/* Compact No File State */}
                            {!tab && (
                                <Card className="border-dashed border-muted-foreground/30 bg-muted/10 mt-4">
                                    <CardContent className="p-6 text-center space-y-3">
                                        <div className="w-12 h-12 mx-auto rounded-xl bg-muted/50 flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-muted-foreground/70" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-foreground">Ready to Assist</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Open a code file to unlock AI-powered features
                                            </p>
                                            <div className="flex items-center justify-center gap-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    <Sparkles className="w-3 h-3 mr-1" />
                                                    AI-Powered
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </ScrollArea>
                ) : (
                    /* Compact Panel View */
                    <div className="h-full flex flex-col">
                        {/* Compact Panel Header */}
                        <div className="px-4 py-3 border-b bg-muted/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const currentAction = actions.find(a => a.id === activePanel);
                                        const IconComponent = currentAction?.icon || Brain;
                                        return (
                                            <>
                                                <div className="p-2 rounded-lg bg-primary text-primary-foreground shadow-sm">
                                                    <IconComponent className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h2 className="font-semibold text-foreground">
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
                                        className="h-8 px-3 text-xs"
                                    >
                                        <ChevronLeft className="w-3 h-3 mr-1" />
                                        Back
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden">
                            {activePanel === "analysis" && (
                                <AnalysisPanel
                                    error={error ?? null}
                                    latestAnalysis={latestAnalysis}
                                    isAnalyzing={isAnalyzing}
                                    onClear={clearAnalysis}
                                    onReload={() => {
                                        if (!tab) {
                                            alert("Please select a tab to analyze code");
                                            return;
                                        }
                                        reload({ body: { code: tab.code, language: tab.language, type: "analysis" } })
                                    }}
                                    status={status}
                                />
                            )}
                            {activePanel === "testcases" && (
                                <TestCasesPanel
                                    tab={tab}
                                    error={testError ?? null}
                                    latestTests={latestTests}
                                    isGeneratingTests={isGeneratingTests}
                                    onClear={clearTests}
                                    onReload={reloadTest}
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

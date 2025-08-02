"use client";
import { Tab, useEditorStore } from "@/store/editorStore";
import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { FileText, Target, Sparkles, Play, Brain, TestTube2, Zap } from "lucide-react";
import { AnalysisPanel } from "./panels/AnalysisPanel";
import { OutputPanel } from "./panels/OutputPanel";
import { SidePanelHeader } from "./panels/SidePanelHeader";
import { SidePanelTabs } from "./panels/SidePanelTabs";
import { TestCasesPanel } from "./panels/TestCasesPanel";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "./FullScreenLoader";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

export default function SidePanel() {
    const router = useRouter();
    const { activeTabId, tabs } = useEditorStore();
    const [running, setRunning] = useState(false);
    const [output, setOutput] = useState("");
    const [activePanel, setActivePanel] = useState("output");
    const [isNavigating, setIsNavigating] = useState(false);

    const tab: Tab | undefined = tabs.find((item) => item.id == activeTabId);

    // Your existing useChat hooks remain the same...
    const {
        messages,
        append,
        stop,
        reload,
        status,
        error,
        setMessages
    } = useChat({
        api: '/api/analyze',
        onError: (error) => {
            console.error('Analysis error:', error);
        },
        onFinish: (message) => {
            console.log('Analysis completed:', message);
        }
    });

    const {
        messages: testMessages,
        append: appendTest,
        stop: stopTest,
        reload: reloadTest,
        status: testStatus,
        error: testError,
        setMessages: setTestMessages
    } = useChat({
        api: '/api/generate-tests',
        onError: (error) => {
            console.error('Test generation error:', error);
        },
        onFinish: (message) => {
            console.log('Test generation completed:', message);
        }
    });

    const handleNavigateToPractice = async () => {
        setIsNavigating(true);
        setTimeout(() => {
            router.push('/practice');
        }, 2000);
    };

    // Your existing functions remain the same...
    async function handleRun() {
        if (tab) {
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
        } else {
            alert("Please select a tab to run code");
        }
    }

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
        }, {
            body: {
                code,
                language,
                type: "analysis"
            }
        });
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
        }, {
            body: {
                code,
                language,
                type: "testcases"
            }
        });
    }

    const clearOutput = () => setOutput("");
    const clearAnalysis = () => setMessages([]);
    const clearTests = () => setTestMessages([]);

    const latestAnalysis = messages.filter(m => m.role === 'assistant').pop();
    const latestTests = testMessages.filter(m => m.role === 'assistant').pop();
    const isAnalyzing = status === 'streaming' || status === 'submitted';
    const isGeneratingTests = testStatus === 'streaming' || testStatus === 'submitted';

    return (
        <>
            {isNavigating && <FullScreenLoader />}

            <div className="h-full flex flex-col">
                {/* Enhanced Header Section */}
                <Card className="rounded-xl border shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
                                    <p className="text-sm text-muted-foreground">Professional code analysis & testing</p>
                                </div>
                            </div>

                            <Button
                                onClick={handleNavigateToPractice}
                                disabled={isNavigating}
                                className="rounded-lg font-medium shadow-sm hover:shadow-md transition-all duration-200"
                                size="sm"
                            >
                                <Target className="w-4 h-4 mr-2" />
                                Practice Mode
                                {isNavigating && (
                                    <div className="absolute inset-0 bg-background/20 animate-pulse rounded-lg" />
                                )}
                            </Button>
                        </div>

                        {tab && (
                            <>
                                <Separator className="my-3" />
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <Badge variant="secondary" className="rounded-md text-xs font-medium">
                                        {tab.name}
                                    </Badge>
                                    <Badge variant="outline" className="rounded-md text-xs capitalize">
                                        {tab.language}
                                    </Badge>
                                </div>
                            </>
                        )}
                    </CardHeader>
                </Card>

                {/* Action Buttons Section */}
                <Card className="rounded-xl border shadow-sm mt-4">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                onClick={isAnalyzing ? stop : handleAnalyze}
                                disabled={!tab}
                                variant={isAnalyzing ? "destructive" : "default"}
                                size="sm"
                                className="rounded-lg flex flex-col items-center gap-2 h-auto py-3 font-medium"
                            >
                                <Brain className="w-4 h-4" />
                                <span className="text-xs">
                                    {isAnalyzing ? "Stop" : "Analyze"}
                                </span>
                                {isAnalyzing && (
                                    <div className="flex gap-0.5">
                                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" />
                                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                )}
                            </Button>

                            <Button
                                onClick={isGeneratingTests ? stopTest : handleGenerateTests}
                                disabled={!tab}
                                variant={isGeneratingTests ? "destructive" : "outline"}
                                size="sm"
                                className="rounded-lg flex flex-col items-center gap-2 h-auto py-3 font-medium"
                            >
                                <TestTube2 className="w-4 h-4" />
                                <span className="text-xs">
                                    {isGeneratingTests ? "Stop" : "Tests"}
                                </span>
                                {isGeneratingTests && (
                                    <div className="flex gap-0.5">
                                        <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                                        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                                        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                                    </div>
                                )}
                            </Button>

                            <Button
                                onClick={handleRun}
                                disabled={running || !tab}
                                variant="secondary"
                                size="sm"
                                className="rounded-lg flex flex-col items-center gap-2 h-auto py-3 font-medium"
                            >
                                <Play className="w-4 h-4" />
                                <span className="text-xs">
                                    {running ? "Running" : "Run"}
                                </span>
                                {running && (
                                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Panel Content */}
                <Card className="rounded-xl border shadow-sm mt-4 flex-1 overflow-hidden">
                    <CardContent className="p-0 h-full flex flex-col">
                        <SidePanelTabs
                            activePanel={activePanel}
                            setActivePanel={setActivePanel}
                            isAnalyzing={isAnalyzing}
                            isGeneratingTests={isGeneratingTests}
                            running={running}
                        />

                        <div className="flex-1 overflow-hidden">
                            {activePanel === "analysis" ? (
                                <AnalysisPanel
                                    error={error ?? null}
                                    latestAnalysis={latestAnalysis}
                                    isAnalyzing={isAnalyzing}
                                    onClear={clearAnalysis}
                                    onReload={reload}
                                    status={status}
                                />
                            ) : activePanel === "testcases" ? (
                                <TestCasesPanel
                                    tab={tab}
                                    error={testError ?? null}
                                    latestTests={latestTests}
                                    isGeneratingTests={isGeneratingTests}
                                    onClear={clearTests}
                                    onReload={reloadTest}
                                    status={testStatus}
                                />
                            ) : (
                                <OutputPanel
                                    output={output}
                                    onClear={clearOutput}
                                />
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

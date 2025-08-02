"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TestTube, RotateCcw, Play, Check, X, AlertCircle, Plus, Trash2, Bot, Eye, Zap, Brain } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Tab } from "@/store/editorStore";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface TestCase {
    id: string;
    input: string;
    expectedOutput: string;
    status: 'pending' | 'running' | 'passed' | 'failed';
    actualOutput?: string;
    error?: string;
    explanation?: string;
}

interface TestCasesPanelProps {
    tab: Tab | undefined;
    error: Error | null;
    latestTests: any;
    isGeneratingTests: boolean;
    status: string;
    onClear: () => void;
    onReload: () => void;
}

export function TestCasesPanel({
    tab,
    error,
    latestTests,
    isGeneratingTests,
    status,
    onClear,
    onReload
}: TestCasesPanelProps) {
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [runningTests, setRunningTests] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
    const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
    const [newTestInput, setNewTestInput] = useState("");
    const [newTestOutput, setNewTestOutput] = useState("");
    const [apiError, setApiError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    // Parse AI-generated test cases
    const parseTestCases = useCallback((content: string): TestCase[] => {
        const cases: TestCase[] = [];

        if (content.includes("ERROR:") || !content.trim()) {
            return cases;
        }

        // Simple parsing pattern
        const pattern = /\*\*Input:\*\*\s*([^\n*]+)\s*\*\*(?:Expected\s*)?Output:\*\*\s*([^\n*]+)/gi;
        let match;
        let index = 0;

        while ((match = pattern.exec(content)) !== null && index < 5) {
            const input = match[1]?.trim().replace(/[`*]/g, '');
            const expectedOutput = match[2]?.trim().replace(/[`*]/g, '');

            if (input && expectedOutput) {
                cases.push({
                    id: `test-${++index}`,
                    input,
                    expectedOutput,
                    status: 'pending'
                });
            }
        }

        return cases;
    }, []);

    // Parse test cases when AI response comes
    useEffect(() => {
        if (latestTests?.content && !isGeneratingTests) {
            const parsed = parseTestCases(latestTests.content);
            if (parsed.length > 0) {
                setTestCases(parsed);
                setApiError(null);
            } else {
                setApiError("No valid test cases found");
            }
        }
    }, [latestTests, isGeneratingTests, parseTestCases]);

    // Run single test
    const runTest = useCallback(async (testCase: TestCase) => {
        if (!tab?.code) {
            setApiError("No code to test");
            return;
        }

        setTestCases(prev => prev.map(tc =>
            tc.id === testCase.id ? { ...tc, status: 'running' } : tc
        ));

        try {
            const res = await fetch("/api/ai-execute", {
                method: "POST",
                body: JSON.stringify({
                    code: tab.code,
                    language: tab.language,
                    input: testCase.input,
                    expectedOutput: testCase.expectedOutput
                }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? {
                    ...tc,
                    status: data.passed ? 'passed' : 'failed',
                    actualOutput: data.actualOutput || "",
                    error: data.error || null,
                    explanation: data.explanation || ""
                } : tc
            ));

        } catch (error: any) {
            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? {
                    ...tc,
                    status: 'failed',
                    error: error.message,
                    actualOutput: 'Execution failed'
                } : tc
            ));
        }
    }, [tab]);

    // Run all tests
    const runAllTests = useCallback(async () => {
        setRunningTests(true);
        setProgress(0);

        for (let i = 0; i < testCases.length; i++) {
            await runTest(testCases[i]);
            setProgress(((i + 1) / testCases.length) * 100);
            if (i < testCases.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        setRunningTests(false);
    }, [testCases, runTest]);

    // Add custom test
    const addTest = () => {
        if (!newTestInput.trim() || !newTestOutput.trim()) {
            setApiError("Both input and output are required");
            return;
        }

        const newTest: TestCase = {
            id: `custom-${Date.now()}`,
            input: newTestInput.trim(),
            expectedOutput: newTestOutput.trim(),
            status: 'pending'
        };

        setTestCases(prev => [...prev, newTest]);
        setShowAddDialog(false);
        setNewTestInput("");
        setNewTestOutput("");
        setApiError(null);
    };

    // Remove test
    const removeTest = (id: string) => {
        setTestCases(prev => prev.filter(tc => tc.id !== id));
    };

    // Get status styling
    const getStatusDisplay = (testCase: TestCase) => {
        switch (testCase.status) {
            case 'running':
                return {
                    icon: <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />,
                    badge: <Badge variant="secondary">Running</Badge>
                };
            case 'passed':
                return {
                    icon: <Check className="w-4 h-4 text-primary" />,
                    badge: <Badge className="bg-primary">Passed</Badge>
                };
            case 'failed':
                return {
                    icon: <X className="w-4 h-4 text-destructive" />,
                    badge: <Badge variant="destructive">Failed</Badge>
                };
            default:
                return {
                    icon: <div className="w-4 h-4 border-2 border-muted rounded-full" />,
                    badge: <Badge variant="outline">Pending</Badge>
                };
        }
    };

    const passedTests = testCases.filter(tc => tc.status === 'passed').length;
    const totalTests = testCases.length;

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                    {/* Error State */}
                    {error ? (
                        <Card className="border-destructive bg-destructive/5">
                            <CardContent className="p-4 text-center">
                                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                                <h3 className="font-medium text-destructive mb-2">Generation Failed</h3>
                                <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
                                <Button onClick={onReload} variant="outline" size="sm">
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Try Again
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Header */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Brain className="w-5 h-5 text-primary" />
                                            <div>
                                                <CardTitle className="text-lg">AI Test Executor</CardTitle>
                                                <p className="text-sm text-muted-foreground">Smart code testing</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline">
                                            {tab?.language?.toUpperCase() || 'CODE'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                            </Card>

                            {/* Actions */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            onClick={() => setShowAddDialog(true)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Test
                                        </Button>

                                        {totalTests > 0 && (
                                            <Button
                                                onClick={runAllTests}
                                                disabled={runningTests}
                                                size="sm"
                                            >
                                                <Zap className="w-4 h-4 mr-2" />
                                                {runningTests ? `Running (${Math.round(progress)}%)` : `Run All (${totalTests})`}
                                            </Button>
                                        )}

                                        {latestTests && (
                                            <Button
                                                onClick={onClear}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Progress */}
                            {runningTests && (
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Progress</span>
                                                <span>{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Error Display */}
                            {apiError && (
                                <Card className="border-destructive bg-destructive/5">
                                    <CardContent className="p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-destructive">{apiError}</span>
                                            <Button
                                                onClick={() => setApiError(null)}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Results Summary */}
                            {totalTests > 0 && (
                                <Card className="bg-primary/5">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium flex items-center gap-2">
                                                <TestTube className="w-4 h-4" />
                                                Results
                                            </h4>
                                            <div className="flex gap-2">
                                                <Badge variant="outline">{totalTests} Total</Badge>
                                                <Badge>{passedTests} Passed</Badge>
                                            </div>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all"
                                                style={{ width: `${totalTests > 0 ? (passedTests / totalTests) * 100 : 0}%` }}
                                            />
                                        </div>
                                        {passedTests === totalTests && totalTests > 0 && (
                                            <p className="text-sm text-primary mt-2">
                                                🎉 All tests passed!
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Test Cases */}
                            <div className="space-y-3">
                                {testCases.map((testCase, index) => {
                                    const { icon, badge } = getStatusDisplay(testCase);

                                    return (
                                        <Card key={testCase.id}>
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        {icon}
                                                        <span className="font-medium">Test {index + 1}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {badge}

                                                        {testCase.explanation && (
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedTestCase(testCase);
                                                                    setShowAnalysisDialog(true);
                                                                }}
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                            </Button>
                                                        )}

                                                        <Button
                                                            onClick={() => runTest(testCase)}
                                                            disabled={testCase.status === 'running'}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <Play className="w-3 h-3" />
                                                        </Button>

                                                        <Button
                                                            onClick={() => removeTest(testCase.id)}
                                                            variant="ghost"
                                                            size="sm"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">Input</label>
                                                        <div className="p-2 bg-muted rounded font-mono text-sm">
                                                            {testCase.input}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">Expected</label>
                                                        <div className="p-2 bg-muted rounded font-mono text-sm">
                                                            {testCase.expectedOutput}
                                                        </div>
                                                    </div>
                                                </div>

                                                {testCase.actualOutput && (
                                                    <div className="mb-4">
                                                        <label className="text-xs font-medium text-muted-foreground">Actual Output</label>
                                                        <div className={`p-2 rounded font-mono text-sm ${testCase.status === 'passed'
                                                            ? 'bg-primary/10 border border-primary/20'
                                                            : 'bg-destructive/10 border border-destructive/20'
                                                            }`}>
                                                            {testCase.actualOutput}
                                                        </div>
                                                    </div>
                                                )}

                                                {testCase.error && (
                                                    <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                                                        <strong>Error:</strong> {testCase.error}
                                                    </div>
                                                )}

                                                {testCase.status === 'running' && (
                                                    <div className="p-2 bg-primary/10 rounded text-sm flex items-center gap-2">
                                                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        Running test...
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Empty State */}
                            {testCases.length === 0 && !isGeneratingTests && (
                                <Card className="text-center">
                                    <CardContent className="p-8">
                                        <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="font-medium mb-2">No Tests Yet</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Add tests or generate them with AI
                                        </p>
                                        <Button onClick={() => setShowAddDialog(true)} variant="outline">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add First Test
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Loading State */}
                            {isGeneratingTests && (
                                <Card className="text-center">
                                    <CardContent className="p-8">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                        <h3 className="font-medium mb-2">Generating Tests</h3>
                                        <p className="text-sm text-muted-foreground">
                                            AI is creating test cases for your code
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add Test Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Test Case</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Input</label>
                            <Textarea
                                value={newTestInput}
                                onChange={(e) => setNewTestInput(e.target.value)}
                                placeholder="Test input"
                                className="font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">Expected Output</label>
                            <Textarea
                                value={newTestOutput}
                                onChange={(e) => setNewTestOutput(e.target.value)}
                                placeholder="Expected result"
                                className="font-mono"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>
                                Cancel
                            </Button>
                            <Button onClick={addTest}>
                                Add Test
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Analysis Dialog */}
            <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Test Analysis</DialogTitle>
                    </DialogHeader>
                    {selectedTestCase && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Input</label>
                                    <div className="p-2 bg-muted rounded font-mono text-sm">
                                        {selectedTestCase.input}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Expected</label>
                                    <div className="p-2 bg-muted rounded font-mono text-sm">
                                        {selectedTestCase.expectedOutput}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Actual</label>
                                    <div className={`p-2 rounded font-mono text-sm ${selectedTestCase.status === 'passed'
                                        ? 'bg-primary/10'
                                        : 'bg-destructive/10'
                                        }`}>
                                        {selectedTestCase.actualOutput}
                                    </div>
                                </div>
                            </div>

                            {selectedTestCase.explanation && (
                                <div>
                                    <label className="text-sm font-medium mb-2 block">AI Explanation</label>
                                    <div className="p-3 bg-muted rounded text-sm">
                                        {selectedTestCase.explanation}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button onClick={() => setShowAnalysisDialog(false)}>
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

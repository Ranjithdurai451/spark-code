"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    TestTube,
    RotateCcw,
    X,
    AlertCircle,
    Plus,
    Trash2,
    Bot,
    Eye,
    Zap,
    Brain,
    Code,
    Timer,
    Target,
    Loader2,
    PlayCircle,
    CheckCircle2,
    XCircle,
    Clock,
    FileText
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tab } from "@/store/editorStore";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface TestCase {
    id: string;
    input: any[];
    output: any;
    status: 'pending' | 'running' | 'passed' | 'failed';
    actualOutput?: any;
    error?: string;
    explanation?: string;
    executionTime?: number;
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
    const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

    // Scroll management refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isUserScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastContentLengthRef = useRef(0);

    // Handle user scroll detection
    const handleScroll = useCallback(() => {
        isUserScrollingRef.current = true;

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Reset user scrolling flag after 1.5 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
            isUserScrollingRef.current = false;
        }, 1500);
    }, []);

    // Parse AI-generated test cases
    const parseTestCases = useCallback((content: string): TestCase[] => {
        const cases: TestCase[] = [];

        if (content.includes("ERROR:") || !content.trim()) {
            return cases;
        }

        try {
            // Try to parse as JSON first
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.map((testCase, index) => ({
                        id: `ai-test-${index + 1}`,
                        input: testCase.input || [],
                        output: testCase.output,
                        status: 'pending' as const
                    }));
                }
            }

            // Fallback parsing method
            const pattern = /\*\*Input:\*\*\s*([^\n*]+)\s*\*\*(?:Expected\s*)?Output:\*\*\s*([^\n*]+)/gi;
            let match;
            let index = 0;

            while ((match = pattern.exec(content)) !== null && index < 10) {
                const input = match[1]?.trim().replace(/[`*]/g, '');
                const expectedOutput = match[2]?.trim().replace(/[`*]/g, '');

                if (input && expectedOutput) {
                    cases.push({
                        id: `test-${++index}`,
                        input: [input],
                        output: expectedOutput,
                        status: 'pending'
                    });
                }
            }

            return cases;
        } catch (parseError) {
            console.error("Error parsing test cases:", parseError);
            return cases;
        }
    }, []);

    // Parse test cases when AI response comes
    useEffect(() => {
        if (latestTests?.content && !isGeneratingTests) {
            const parsed = parseTestCases(latestTests.content);
            if (parsed.length > 0) {
                setTestCases(parsed);
                setApiError(null);
                toast.success(`Generated ${parsed.length} test cases`);
            } else {
                setApiError("No valid test cases found in response");
            }
        }
    }, [latestTests, isGeneratingTests, parseTestCases]);

    // Smart auto-scroll for streaming content
    useEffect(() => {
        if (isGeneratingTests && latestTests?.content) {
            const currentLength = latestTests.content.length;

            // Only auto-scroll if user isn't manually scrolling and content has grown
            if (!isUserScrollingRef.current &&
                currentLength > lastContentLengthRef.current &&
                scrollContainerRef.current) {

                requestAnimationFrame(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                            top: scrollContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                });
            }

            lastContentLengthRef.current = currentLength;
        }
    }, [latestTests?.content, isGeneratingTests]);

    // Reset scroll tracking when generation starts
    useEffect(() => {
        if (isGeneratingTests) {
            isUserScrollingRef.current = false;
            lastContentLengthRef.current = 0;
        }
    }, [isGeneratingTests]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    // Run single test
    const runTest = useCallback(async (testCase: TestCase) => {
        if (!tab?.code) {
            setApiError("No code to test");
            return;
        }

        setTestCases(prev => prev.map(tc =>
            tc.id === testCase.id ? { ...tc, status: 'running' } : tc
        ));

        const startTime = Date.now();

        try {
            const res = await fetch("/api/ai-execute", {
                method: "POST",
                body: JSON.stringify({
                    code: tab.code,
                    language: tab.language,
                    input: testCase.input,
                    expectedOutput: testCase.output
                }),
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();
            const executionTime = Date.now() - startTime;

            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? {
                    ...tc,
                    status: data.passed ? 'passed' : 'failed',
                    actualOutput: data.actualOutput,
                    error: data.error || null,
                    explanation: data.explanation || "",
                    executionTime
                } : tc
            ));

            // Auto-expand failed tests
            if (!data.passed) {
                setExpandedTests(prev => new Set([...prev, testCase.id]));
            }

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            setTestCases(prev => prev.map(tc =>
                tc.id === testCase.id ? {
                    ...tc,
                    status: 'failed',
                    error: error.message,
                    actualOutput: 'Execution failed',
                    executionTime
                } : tc
            ));
            setExpandedTests(prev => new Set([...prev, testCase.id]));
        }
    }, [tab]);

    // Run all tests
    const runAllTests = useCallback(async () => {
        if (testCases.length === 0) return;

        setRunningTests(true);
        setProgress(0);
        setExpandedTests(new Set());

        for (let i = 0; i < testCases.length; i++) {
            await runTest(testCases[i]);
            setProgress(((i + 1) / testCases.length) * 100);

            if (i < testCases.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        setRunningTests(false);

        // Show completion toast
        const passed = testCases.filter(tc => tc.status === 'passed').length;
        if (passed === testCases.length) {
            toast.success("All tests passed! 🎉");
        } else {
            toast.error(`${testCases.length - passed} test(s) failed`);
        }
    }, [testCases, runTest]);

    // Add custom test
    const addTest = () => {
        if (!newTestInput.trim() || !newTestOutput.trim()) {
            setApiError("Both input and output are required");
            return;
        }

        try {
            let parsedInput;
            try {
                parsedInput = JSON.parse(newTestInput.trim());
                if (!Array.isArray(parsedInput)) {
                    parsedInput = [parsedInput];
                }
            } catch {
                parsedInput = [newTestInput.trim()];
            }

            let parsedOutput;
            try {
                parsedOutput = JSON.parse(newTestOutput.trim());
            } catch {
                parsedOutput = newTestOutput.trim();
            }

            const newTest: TestCase = {
                id: `custom-${Date.now()}`,
                input: parsedInput,
                output: parsedOutput,
                status: 'pending'
            };

            setTestCases(prev => [...prev, newTest]);
            setShowAddDialog(false);
            setNewTestInput("");
            setNewTestOutput("");
            setApiError(null);
            toast.success("Test case added");
        } catch (error) {
            setApiError("Invalid JSON format in input or output");
        }
    };

    // Remove test
    const removeTest = (id: string) => {
        setTestCases(prev => prev.filter(tc => tc.id !== id));
        setExpandedTests(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        toast.success("Test case removed");
    };

    // Toggle test expansion
    const toggleExpanded = (id: string) => {
        setExpandedTests(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Format display values
    const formatValue = (value: any): string => {
        if (typeof value === 'string') return value;
        return JSON.stringify(value, null, 2);
    };

    const formatLeetCodeInput = (input: any[]): string => {
        if (!Array.isArray(input)) return formatValue(input);
        if (input.length === 1) return formatValue(input[0]);
        return input.map(param => formatValue(param)).join(', ');
    };

    // Get status styling
    const getStatusDisplay = (testCase: TestCase) => {
        switch (testCase.status) {
            case 'running':
                return {
                    icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
                    badge: <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Running</Badge>,
                };
            case 'passed':
                return {
                    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                    badge: <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">Passed</Badge>,
                };
            case 'failed':
                return {
                    icon: <XCircle className="w-4 h-4 text-red-500" />,
                    badge: <Badge variant="destructive">Failed</Badge>,
                };
            default:
                return {
                    icon: <Clock className="w-4 h-4 text-gray-400" />,
                    badge: <Badge variant="outline">Pending</Badge>,
                };
        }
    };

    const passedTests = testCases.filter(tc => tc.status === 'passed').length;
    const failedTests = testCases.filter(tc => tc.status === 'failed').length;
    const totalTests = testCases.length;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return (
        <div className="h-full flex flex-col min-w-0">
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgb(156 163 175) transparent',
                    scrollBehavior: 'smooth'
                }}
                onScroll={handleScroll}
            >
                <div className="p-2 space-y-2 max-w-full">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1 rounded bg-primary/10">
                                <Brain className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold">AI Test Runner</h2>
                                <p className="text-xs text-muted-foreground">Code testing with analysis</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            <Code className="w-3 h-3 mr-1" />
                            {tab?.language?.toUpperCase() || 'CODE'}
                        </Badge>
                    </div>

                    {/* Error States */}
                    {error && (
                        <Alert className="border-destructive/50 bg-destructive/5 py-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <AlertDescription className="text-destructive">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">{error.message}</span>
                                    <Button onClick={onReload} variant="outline" size="sm" className="h-6 text-xs">
                                        <RotateCcw className="w-3 h-3 mr-1" />
                                        Retry
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {apiError && (
                        <Alert className="border-destructive/50 bg-destructive/5 py-2">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <AlertDescription className="text-destructive">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs">{apiError}</span>
                                    <Button onClick={() => setApiError(null)} variant="ghost" size="sm" className="h-6 text-xs">
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {!error && (
                        <>
                            {/* Compact Stats */}
                            {/* {totalTests > 0 && (
                                <Card>
                                    <CardContent className="p-2">
                                        <div className="grid grid-cols-4 gap-2 mb-2">
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-primary">{totalTests}</div>
                                                <div className="text-xs text-muted-foreground">Total</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-green-600">{passedTests}</div>
                                                <div className="text-xs text-muted-foreground">Passed</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold text-red-600">{failedTests}</div>
                                                <div className="text-xs text-muted-foreground">Failed</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-sm font-bold">{Math.round(successRate)}%</div>
                                                <div className="text-xs text-muted-foreground">Success</div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span>Progress</span>
                                                <span>{passedTests}/{totalTests}</span>
                                            </div>
                                            <Progress value={successRate} className="h-1" />
                                        </div>

                                        {passedTests === totalTests && totalTests > 0 && (
                                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                                                <div className="flex items-center gap-1 text-green-700 dark:text-green-300">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    <span className="text-xs font-medium">All tests passed! 🎉</span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )} */}

                            {/* Compact Actions */}
                            <Card>
                                <CardContent className="">
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            onClick={() => setShowAddDialog(true)}
                                            variant="outline"
                                            size="sm"
                                            className="h-6 text-xs"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Add
                                        </Button>

                                        {totalTests > 0 && (
                                            <Button
                                                onClick={runAllTests}
                                                disabled={runningTests}
                                                size="sm"
                                                className="h-6 text-xs border"
                                            >
                                                {runningTests ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                        Running
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-3 h-3 mr-1" />
                                                        Run All
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        {/* <Button
                                            onClick={() => setExpandedTests(new Set(testCases.map(tc => tc.id)))}
                                            variant="ghost"
                                            size="sm"
                                            disabled={totalTests === 0}
                                            className="h-6 text-xs border"
                                        >
                                            Expand
                                        </Button>

                                        <Button
                                            onClick={() => setExpandedTests(new Set())}
                                            variant="ghost"
                                            size="sm"
                                            disabled={totalTests === 0}
                                            className="h-6 text-xs border"
                                        >
                                            Collapse
                                        </Button>

                                        {latestTests && (
                                            <Button
                                                onClick={onClear}
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs border"
                                            >
                                                Clear
                                            </Button>
                                        )} */}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Progress Bar */}
                            {runningTests && (
                                <Card>
                                    <CardContent className="p-2">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Running Tests
                                                </span>
                                                <span>{Math.round(progress)}%</span>
                                            </div>
                                            <Progress value={progress} className="h-1" />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Test Cases */}
                            {!isGeneratingTests && <div className="space-y-2">
                                {testCases.map((testCase, index) => {
                                    const { icon, badge } = getStatusDisplay(testCase);
                                    const isExpanded = expandedTests.has(testCase.id);

                                    return (
                                        <Card key={testCase.id} className={`max-w-full hover:bg-muted/50  overflow-hidden ${testCase.status === 'passed' ? 'border-green-200 dark:border-green-800' :
                                            testCase.status === 'failed' ? 'border-red-200 dark:border-red-800' :
                                                testCase.status === 'running' ? 'border-blue-200 dark:border-blue-800' :
                                                    'border-border'
                                            }`}>
                                            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(testCase.id)}>
                                                <CollapsibleTrigger asChild>
                                                    <CardHeader className="pb-2 cursor-pointer  transition-colors">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                {icon}
                                                                <div className="min-w-0">
                                                                    <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                                                                    {testCase.executionTime && (
                                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                            <Timer className="w-2 h-2" />
                                                                            {testCase.executionTime}ms
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex-shrink-0">
                                                                {badge}
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                </CollapsibleTrigger>

                                                <CollapsibleContent>
                                                    <CardContent className="pt-0">
                                                        <Separator className="mb-2" />

                                                        <div className="space-y-2">
                                                            {/* Input/Output Display */}
                                                            <div className="space-y-2">
                                                                <div className="flex items-start gap-2">
                                                                    <Label className="text-xs font-medium text-muted-foreground w-12 shrink-0 mt-1">
                                                                        Input:
                                                                    </Label>
                                                                    <div className="p-1.5 bg-muted rounded text-xs font-mono flex-1 min-w-0 break-all">
                                                                        {formatLeetCodeInput(testCase.input)}
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-start gap-2">
                                                                    <Label className="text-xs font-medium text-muted-foreground w-12 shrink-0 mt-1">
                                                                        Output:
                                                                    </Label>
                                                                    <div className="p-1.5 bg-muted rounded text-xs font-mono flex-1 min-w-0 break-all">
                                                                        {formatValue(testCase.output)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Actual Output */}
                                                            {testCase.actualOutput !== undefined && (
                                                                <div className="flex items-start gap-2">
                                                                    <Label className="text-xs font-medium text-muted-foreground w-12 shrink-0 mt-1">
                                                                        Actual:
                                                                    </Label>
                                                                    <div className={`p-1.5 rounded text-xs font-mono flex-1 min-w-0 break-all ${testCase.status === 'passed'
                                                                        ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800'
                                                                        : 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800'
                                                                        }`}>
                                                                        {formatValue(testCase.actualOutput)}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Error Details */}
                                                            {testCase.error && (
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-medium text-red-600 dark:text-red-400">
                                                                        Error Details
                                                                    </Label>
                                                                    <div className="p-2 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded">
                                                                        <p className="text-xs text-red-700 dark:text-red-300 break-words">
                                                                            {testCase.error}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* AI Analysis */}
                                                            {testCase.explanation && (
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs font-medium text-muted-foreground">
                                                                        AI Analysis
                                                                    </Label>
                                                                    <div className="p-2 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded">
                                                                        <p className="text-xs text-blue-700 dark:text-blue-300 break-words">
                                                                            {testCase.explanation}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Action Buttons */}
                                                            <div className="flex items-center gap-1 pt-1">
                                                                <Button
                                                                    onClick={() => runTest(testCase)}
                                                                    disabled={testCase.status === 'running'}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 text-xs"
                                                                >
                                                                    {testCase.status === 'running' ? (
                                                                        <Loader2 className="w-2 h-2 animate-spin mr-1" />
                                                                    ) : (
                                                                        <PlayCircle className="w-2 h-2 mr-1" />
                                                                    )}
                                                                    {testCase.status === 'running' ? 'Running...' : 'Run'}
                                                                </Button>

                                                                {/* {testCase.explanation && (
                                                                    <Button
                                                                        onClick={() => {
                                                                            setSelectedTestCase(testCase);
                                                                            setShowAnalysisDialog(true);
                                                                        }}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 text-xs"
                                                                    >
                                                                        <Eye className="w-2 h-2 mr-1" />
                                                                        View
                                                                    </Button>
                                                                )} */}

                                                                <Button
                                                                    onClick={() => removeTest(testCase.id)}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                >
                                                                    <Trash2 className="w-2 h-2 mr-1" />
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </Card>
                                    );
                                })}
                            </div>
                            }

                            {/* Empty State */}
                            {testCases.length === 0 && !isGeneratingTests && (
                                <Card className="text-center">
                                    <CardContent className="p-6">
                                        <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                            <TestTube className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-sm font-medium mb-2">No Test Cases</h3>
                                        <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
                                            Create test cases manually or generate them with AI.
                                        </p>
                                        <div className="flex gap-2 justify-center">
                                            <Button onClick={() => setShowAddDialog(true)} className="h-8 text-xs">
                                                <Plus className="w-3 h-3 mr-1" />
                                                Add Test
                                            </Button>
                                            <Button
                                                onClick={onReload}
                                                variant="outline"
                                                className="h-8 text-xs"
                                                disabled={isGeneratingTests}
                                            >
                                                {isGeneratingTests ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Bot className="w-3 h-3 mr-1" />
                                                        Generate
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Loading State */}
                            {isGeneratingTests && (
                                <Card className="text-center">
                                    <CardContent className="p-6">
                                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        </div>
                                        <h3 className="text-sm font-medium mb-2">Generating Test Cases</h3>
                                        <p className="text-xs text-muted-foreground">
                                            AI is analyzing your code...
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            Add Test Case
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="simple" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="simple">Simple</TabsTrigger>
                            <TabsTrigger value="json">JSON</TabsTrigger>
                        </TabsList>

                        <TabsContent value="simple" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="simple-input">Input</Label>
                                <Input
                                    id="simple-input"
                                    value={newTestInput}
                                    onChange={(e) => setNewTestInput(e.target.value)}
                                    placeholder='nums = [2,7,11,15], target = 9'
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="simple-output">Expected Output</Label>
                                <Input
                                    id="simple-output"
                                    value={newTestOutput}
                                    onChange={(e) => setNewTestOutput(e.target.value)}
                                    placeholder='[0,1]'
                                    className="font-mono"
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="json" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="json-input">Input (JSON Array)</Label>
                                <Textarea
                                    id="json-input"
                                    value={newTestInput}
                                    onChange={(e) => setNewTestInput(e.target.value)}
                                    placeholder='[[2, 7, 11, 15], 9]'
                                    className="font-mono h-20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="json-output">Expected Output (JSON)</Label>
                                <Textarea
                                    id="json-output"
                                    value={newTestOutput}
                                    onChange={(e) => setNewTestOutput(e.target.value)}
                                    placeholder='[0, 1]'
                                    className="font-mono h-20"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {apiError && (
                        <Alert className="border-destructive/50 bg-destructive/5">
                            <AlertCircle className="h-4 w-4 text-destructive" />
                            <AlertDescription className="text-destructive text-sm">
                                {apiError}
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddDialog(false);
                                setNewTestInput("");
                                setNewTestOutput("");
                                setApiError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={addTest}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Test
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Analysis Dialog */}
            <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Test Analysis
                        </DialogTitle>
                    </DialogHeader>

                    {selectedTestCase && (
                        <div
                            className="max-h-[60vh] overflow-y-auto overflow-x-hidden pr-2"
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgb(156 163 175) transparent'
                            }}
                        >
                            <div className="space-y-4">
                                {/* Test Overview */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center p-2 bg-muted rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Status</div>
                                                <div className="flex items-center justify-center gap-2">
                                                    {getStatusDisplay(selectedTestCase).icon}
                                                    <span className="font-medium capitalize text-sm">{selectedTestCase.status}</span>
                                                </div>
                                            </div>
                                            <div className="text-center p-2 bg-muted rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Time</div>
                                                <div className="font-medium text-sm">
                                                    {selectedTestCase.executionTime ? `${selectedTestCase.executionTime}ms` : 'N/A'}
                                                </div>
                                            </div>
                                            <div className="text-center p-2 bg-muted rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Match</div>
                                                <div className="font-medium text-sm">
                                                    {selectedTestCase.status === 'passed' ? 'Yes' :
                                                        selectedTestCase.status === 'failed' ? 'No' : 'Pending'}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Input/Output */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Input/Output
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Input</Label>
                                            <div className="p-3 bg-muted rounded">
                                                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                                    {formatValue(selectedTestCase.input)}
                                                </pre>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-green-700 dark:text-green-400">
                                                    Expected
                                                </Label>
                                                <div className="p-3 bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 rounded">
                                                    <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                                        {formatValue(selectedTestCase.output)}
                                                    </pre>
                                                </div>
                                            </div>

                                            {selectedTestCase.actualOutput !== undefined && (
                                                <div className="space-y-2">
                                                    <Label className={`text-sm font-medium ${selectedTestCase.status === 'passed'
                                                        ? 'text-green-700 dark:text-green-400'
                                                        : 'text-red-700 dark:text-red-400'
                                                        }`}>
                                                        Actual
                                                    </Label>
                                                    <div className={`p-3 rounded border ${selectedTestCase.status === 'passed'
                                                        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                                                        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                                                        }`}>
                                                        <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                                                            {formatValue(selectedTestCase.actualOutput)}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* AI Analysis */}
                                {selectedTestCase.explanation && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Bot className="w-4 h-4" />
                                                AI Analysis
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="p-3 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 rounded">
                                                <p className="text-sm text-blue-900 dark:text-blue-100 break-words">
                                                    {selectedTestCase.explanation}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Error */}
                                {selectedTestCase.error && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                                                <AlertCircle className="w-4 h-4" />
                                                Error
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="p-3 bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800 rounded">
                                                <p className="text-sm font-mono text-red-900 dark:text-red-100 break-words">
                                                    {selectedTestCase.error}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setShowAnalysisDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

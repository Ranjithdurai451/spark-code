"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Target,
    Play,
    RotateCcw,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    BookOpen,
    Code,
    Building,
    Tag,
    Lightbulb,
    Loader2,
    Timer,
    TrendingUp
} from "lucide-react";
import { useState } from "react";
import { Tab } from "@/store/editorStore";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";
import { Editor } from "@monaco-editor/react";
import { useTheme } from "next-themes";

const DSA_TOPICS = [
    "Arrays", "Strings", "Linked Lists", "Stacks", "Queues",
    "Trees", "Binary Search Trees", "Heaps", "Graphs", "Hash Tables",
    "Dynamic Programming", "Greedy Algorithms", "Backtracking",
    "Sorting Algorithms", "Searching Algorithms", "Two Pointers",
    "Sliding Window", "Binary Search", "Divide and Conquer"
];

const DIFFICULTY_LEVELS = [
    { value: "Easy", label: "Easy", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
    { value: "Medium", label: "Medium", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" },
    { value: "Hard", label: "Hard", color: "text-red-600 bg-red-50 dark:bg-red-900/20" }
];

interface Problem {
    id: number;
    title: string;
    difficulty: string;
    description: string;
    inputFormat: string;
    outputFormat: string;
    constraints: string[];
    examples: Array<{
        input: string;
        output: string;
        explanation: string;
    }>;
    functionSignature: {
        [key: string]: string;
    };
    testCases: Array<{
        input: string;
        expectedOutput: string;
    }>;
    hints: string[];
    tags: string[];
    companies: string[];
}

interface TestResult {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime: string;
    error?: string;
}

interface QuestionPracticeModeProps {
    tab: Tab | undefined;
}

export function QuestionPracticeMode({ tab }: QuestionPracticeModeProps) {
    const { theme } = useTheme();
    const [mode, setMode] = useState<'initial' | 'problems' | 'solving'>('initial');
    const [showTopicDialog, setShowTopicDialog] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
    const [code, setCode] = useState("");
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const handleGenerateQuestions = () => {
        setShowTopicDialog(true);
    };

    const confirmGeneration = async () => {
        if (!selectedTopic || !selectedLevel) {
            alert("Please select both topic and difficulty level");
            return;
        }

        setIsGenerating(true);
        setShowTopicDialog(false);

        try {
            const response = await fetch('/api/generate-practice-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: selectedTopic,
                    level: selectedLevel
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate questions');
            }

            const data = await response.json();
            setProblems(data.problems || []);
            setMode('problems');
        } catch (error) {
            console.error('Generation error:', error);
            alert('Failed to generate questions. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const selectProblem = (problem: Problem) => {
        setCurrentProblem(problem);
        setCode(problem.functionSignature[tab?.language || 'javascript'] || problem.functionSignature.javascript);
        setTestResults([]);
        setMode('solving');
    };

    const runCode = async () => {
        if (!currentProblem || !code.trim()) {
            alert("Please write some code first");
            return;
        }

        setIsRunning(true);
        setTestResults([]);

        try {
            const response = await fetch('/api/execute-practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: tab?.language || 'javascript',
                    testCases: currentProblem.testCases
                })
            });

            if (!response.ok) {
                throw new Error('Execution failed');
            }

            const data = await response.json();
            setTestResults(data.results || []);
        } catch (error) {
            console.error('Execution error:', error);
            alert('Code execution failed. Please check your code.');
        } finally {
            setIsRunning(false);
        }
    };

    const resetPractice = () => {
        setMode('initial');
        setProblems([]);
        setCurrentProblem(null);
        setCode("");
        setTestResults([]);
        setSelectedTopic("");
        setSelectedLevel("");
    };

    // Initial Mode - Question Generation
    if (mode === 'initial') {
        return (
            <div className="flex flex-col h-full p-6 bg-background">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-xl">
                        <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <Target size={40} className="text-primary" />
                        </div>

                        <h1 className="text-2xl font-bold mb-4">Question Practice Mode</h1>

                        <p className="text-base text-muted-foreground mb-6 leading-relaxed">
                            Practice coding problems tailored to your skill level. Select a topic and difficulty
                            to generate custom problems with a LeetCode-style interface.
                        </p>

                        <div className="bg-muted/50 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Zap size={16} className="text-primary" />
                                What You'll Get:
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-600" />
                                    <span>3 Custom Problems</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-600" />
                                    <span>LeetCode-style Interface</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-600" />
                                    <span>Automatic Test Cases</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={12} className="text-green-600" />
                                    <span>Code Execution & Feedback</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerateQuestions}
                            size="lg"
                            className="px-6 py-3"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="mr-2 animate-spin" />
                                    Generating Questions...
                                </>
                            ) : (
                                <>
                                    <Target size={18} className="mr-2" />
                                    Generate Practice Questions
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Topic Selection Dialog */}
                <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Select Practice Parameters</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Topic:</label>
                                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a DSA topic" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DSA_TOPICS.map((topic) => (
                                                <SelectItem key={topic} value={topic}>
                                                    {topic}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Difficulty Level:</label>
                                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose difficulty" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DIFFICULTY_LEVELS.map((level) => (
                                                <SelectItem key={level.value} value={level.value}>
                                                    <div className={`px-2 py-1 rounded font-medium ${level.color}`}>
                                                        {level.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setShowTopicDialog(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmGeneration}
                                    disabled={!selectedTopic || !selectedLevel || isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 size={14} className="mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Questions'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Problems Selection Mode
    if (mode === 'problems') {
        return (
            <div className="flex flex-col h-full p-4 bg-background">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold">Practice Problems</h1>
                        <p className="text-sm text-muted-foreground">
                            {selectedTopic} • {selectedLevel} Level • {problems.length} Problems
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetPractice}>
                        <RotateCcw size={14} className="mr-2" />
                        Generate New
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="space-y-3">
                        {problems.map((problem, index) => (
                            <Card key={problem.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-base">
                                                {index + 1}. {problem.title}
                                            </CardTitle>
                                            <CardDescription className="mt-1 line-clamp-2 text-sm">
                                                {problem.description.substring(0, 150)}...
                                            </CardDescription>
                                        </div>
                                        <Badge className={`ml-3 text-xs ${DIFFICULTY_LEVELS.find(l => l.value === problem.difficulty)?.color}`}>
                                            {problem.difficulty}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Tag size={10} />
                                                {problem.tags.slice(0, 2).join(", ")}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Building size={10} />
                                                {problem.companies.slice(0, 1).join(", ")}
                                            </div>
                                        </div>
                                        <Button size="sm" onClick={() => selectProblem(problem)}>
                                            Solve
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    // LeetCode-style Solving Mode
    if (mode === 'solving' && currentProblem) {
        return (
            <div className="flex h-full bg-background">
                {/* Left Panel - Problem Description */}
                <div className="w-1/2 border-r flex flex-col">
                    <div className="p-3 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setMode('problems')}>
                                    ← Back
                                </Button>
                                <h2 className="font-medium text-sm">{currentProblem.title}</h2>
                            </div>
                            <Badge className={`text-xs ${DIFFICULTY_LEVELS.find(l => l.value === currentProblem.difficulty)?.color}`}>
                                {currentProblem.difficulty}
                            </Badge>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4">
                            <Tabs defaultValue="description" className="w-full">
                                <TabsList className="grid w-full grid-cols-3 h-8">
                                    <TabsTrigger value="description" className="text-xs">Description</TabsTrigger>
                                    <TabsTrigger value="hints" className="text-xs">Hints</TabsTrigger>
                                    <TabsTrigger value="companies" className="text-xs">Companies</TabsTrigger>
                                </TabsList>

                                <TabsContent value="description" className="space-y-3 mt-4">
                                    <div>
                                        <MemoizedMarkdown content={currentProblem.description} id="problem-desc" />
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-1 text-sm">Input Format:</h4>
                                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                            {currentProblem.inputFormat}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-1 text-sm">Output Format:</h4>
                                        <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                            {currentProblem.outputFormat}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-1 text-sm">Constraints:</h4>
                                        <ul className="text-xs text-muted-foreground space-y-1">
                                            {currentProblem.constraints.map((constraint, index) => (
                                                <li key={index}>• {constraint}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="font-medium mb-1 text-sm">Examples:</h4>
                                        {currentProblem.examples.map((example, index) => (
                                            <div key={index} className="bg-muted p-3 rounded mb-2">
                                                <div className="space-y-1 text-xs">
                                                    <div>
                                                        <strong>Input:</strong> <code>{example.input}</code>
                                                    </div>
                                                    <div>
                                                        <strong>Output:</strong> <code>{example.output}</code>
                                                    </div>
                                                    {example.explanation && (
                                                        <div>
                                                            <strong>Explanation:</strong> {example.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="hints" className="mt-4">
                                    <div className="space-y-2">
                                        {currentProblem.hints.map((hint, index) => (
                                            <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border text-xs">
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb size={12} className="text-blue-600 mt-0.5" />
                                                    <p>{hint}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                <TabsContent value="companies" className="mt-4">
                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-medium mb-2 text-sm">Asked by Companies:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {currentProblem.companies.map((company, index) => (
                                                    <Badge key={index} variant="outline" className="text-xs">
                                                        <Building size={10} className="mr-1" />
                                                        {company}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2 text-sm">Related Topics:</h4>
                                            <div className="flex flex-wrap gap-1">
                                                {currentProblem.tags.map((tag, index) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                        <Tag size={10} className="mr-1" />
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel - Code Editor and Results */}
                <div className="w-1/2 flex flex-col">
                    {/* Top Bar with Run Button */}
                    <div className="p-3 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Code size={14} />
                                <span className="font-medium text-sm">Code Editor</span>
                                <Badge variant="outline" className="text-xs">{tab?.language || 'JavaScript'}</Badge>
                            </div>
                            <Button
                                onClick={runCode}
                                disabled={isRunning}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 size={14} className="mr-1 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Play size={14} className="mr-1" />
                                        Run Code
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 min-h-0">
                        <Editor
                            height="55%"
                            language={tab?.language || 'javascript'}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            theme={theme === "dark" ? "vs-dark" : "vs-light"}
                            options={{
                                fontSize: 13,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                automaticLayout: true
                            }}
                        />

                        {/* Test Results */}
                        <div className="h-[45%] border-t bg-muted/30">
                            <div className="p-3 border-b">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    <CheckCircle size={14} />
                                    Test Results
                                    {testResults.length > 0 && (
                                        <Badge variant={testResults.every(r => r.passed) ? "default" : "destructive"} className="text-xs">
                                            {testResults.filter(r => r.passed).length}/{testResults.length} Passed
                                        </Badge>
                                    )}
                                </h4>
                            </div>

                            <ScrollArea className="h-[calc(100%-50px)]">
                                <div className="p-3 space-y-2">
                                    {testResults.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-6">
                                            <Play size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Click "Run Code" to test your solution</p>
                                        </div>
                                    ) : (
                                        testResults.map((result, index) => (
                                            <div key={index} className={`p-2 rounded border text-xs ${result.passed
                                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                                }`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-medium">Test Case {index + 1}</span>
                                                    <div className="flex items-center gap-1">
                                                        {result.passed ? (
                                                            <CheckCircle size={12} className="text-green-600" />
                                                        ) : (
                                                            <XCircle size={12} className="text-red-600" />
                                                        )}
                                                        <span className="text-xs flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {result.executionTime}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1 font-mono">
                                                    <div><strong>Input:</strong> {result.input}</div>
                                                    <div><strong>Expected:</strong> {result.expectedOutput}</div>
                                                    <div><strong>Actual:</strong> {result.actualOutput}</div>
                                                    {result.error && (
                                                        <div className="text-red-600"><strong>Error:</strong> {result.error}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

// components/practice/QuestionGenerator.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Target,
    Loader2,
    Building,
    Tag,
    Lightbulb,
    ArrowLeft
} from "lucide-react";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";

const DSA_TOPICS = [
    "Arrays", "Strings", "Linked Lists", "Stacks", "Queues",
    "Trees", "Binary Search Trees", "Heaps", "Graphs", "Hash Tables",
    "Dynamic Programming", "Greedy Algorithms", "Backtracking",
    "Sorting Algorithms", "Searching Algorithms", "Two Pointers",
    "Sliding Window", "Binary Search", "Divide and Conquer"
];

const DIFFICULTY_LEVELS = [
    { value: "Easy", label: "Easy" },
    { value: "Medium", label: "Medium" },
    { value: "Hard", label: "Hard" }
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

interface QuestionGeneratorProps {
    onProblemSelect: (problem: Problem) => void;
    currentProblem: Problem | null;
}

export function QuestionGenerator({ onProblemSelect, currentProblem }: QuestionGeneratorProps) {
    const [mode, setMode] = useState<'initial' | 'problems' | 'viewing'>('initial');
    const [showTopicDialog, setShowTopicDialog] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [problems, setProblems] = useState<Problem[]>([]);

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
        onProblemSelect(problem);
        setMode('viewing');
    };

    const resetGenerator = () => {
        setMode('initial');
        setProblems([]);
        onProblemSelect(null);
        setSelectedTopic("");
        setSelectedLevel("");
    };

    // Initial Mode
    if (mode === 'initial') {
        return (
            <div className="flex flex-col h-full bg-background">
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                            <Target size={40} className="text-muted-foreground" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4 text-foreground">Generate Practice Questions</h2>

                        <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                            Select a topic and difficulty level to generate coding problems for practice.
                        </p>

                        <Button
                            onClick={handleGenerateQuestions}
                            size="lg"
                            className="w-full h-12 text-base font-medium"
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={20} className="mr-2 animate-spin" />
                                    Generating Questions...
                                </>
                            ) : (
                                <>
                                    <Target size={20} className="mr-2" />
                                    Generate Questions
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Topic Selection Dialog */}
                <Dialog open={showTopicDialog} onOpenChange={setShowTopicDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Select Topic & Difficulty</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div>
                                <label className="text-base font-medium mb-3 block">Topic:</label>
                                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                                    <SelectTrigger className="h-11 text-base">
                                        <SelectValue placeholder="Choose a topic" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DSA_TOPICS.map((topic) => (
                                            <SelectItem key={topic} value={topic} className="text-base">
                                                {topic}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-base font-medium mb-3 block">Difficulty:</label>
                                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                                    <SelectTrigger className="h-11 text-base">
                                        <SelectValue placeholder="Choose difficulty" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DIFFICULTY_LEVELS.map((level) => (
                                            <SelectItem key={level.value} value={level.value} className="text-base">
                                                {level.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setShowTopicDialog(false)} className="text-base">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmGeneration}
                                    disabled={!selectedTopic || !selectedLevel || isGenerating}
                                    className="text-base"
                                >
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // Problems Selection Mode - Fixed Scrolling
    if (mode === 'problems') {
        return (
            <div className="h-full bg-background flex flex-col">
                {/* Fixed Header */}
                <div className="flex-shrink-0 p-2 border-b bg-background">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Practice Problems</h2>
                            <p className="text-base text-muted-foreground mt-1">
                                {selectedTopic} • {selectedLevel} Level
                            </p>
                        </div>
                        <Button variant="outline" onClick={resetGenerator} className="text-base">
                            Generate New
                        </Button>
                    </div>
                </div>

                {/* Scrollable Problems List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-4">
                        {problems.map((problem, index) => (
                            <Card key={problem.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-lg font-semibold text-foreground mb-2">
                                                {index + 1}. {problem.title}
                                            </CardTitle>
                                            <p className="text-base text-muted-foreground line-clamp-2">
                                                {problem.description.substring(0, 150)}...
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="ml-4 text-sm font-medium">
                                            {problem.difficulty}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Tag size={14} />
                                                {problem.tags.slice(0, 2).join(", ")}
                                            </div>
                                        </div>
                                        <Button onClick={() => selectProblem(problem)} className="text-base">
                                            Solve Problem
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Problem Viewing Mode - Fixed Scrolling
    if (mode === 'viewing' && currentProblem) {
        return (
            <div className="h-full bg-background flex flex-col">
                {/* Fixed Header */}
                <div className="flex-shrink-0 p-2 border-b bg-background">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => setMode('problems')}
                            className="text-base font-medium"
                        >
                            <ArrowLeft size={18} className="mr-2" />
                            Back to Problems
                        </Button>
                        <Badge variant="outline" className="text-sm font-medium">
                            {currentProblem.difficulty}
                        </Badge>
                    </div>
                </div>

                {/* Fixed Problem Title */}
                <div className="flex-shrink-0 p-4 border-b bg-background">
                    <h1 className="text-2xl font-bold text-foreground">{currentProblem.title}</h1>
                </div>

                {/* Scrollable Problem Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4">
                        <Tabs defaultValue="description" className="w-full">
                            <div className="sticky top-0 bg-background z-10 pb-4">
                                <TabsList className="grid w-full grid-cols-3 h-10">
                                    <TabsTrigger value="description" className="text-base">Description</TabsTrigger>
                                    <TabsTrigger value="hints" className="text-base">Hints</TabsTrigger>
                                    <TabsTrigger value="companies" className="text-base">Companies</TabsTrigger>
                                </TabsList>
                            </div>

                            <TabsContent value="description" className="space-y-3 mt-0">
                                {/* Problem Description */}
                                <div>
                                    <MemoizedMarkdown
                                        content={currentProblem.description}
                                        id={`problem-${currentProblem.id}-desc`}
                                    />
                                </div>

                                {/* Input/Output Format */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text- mb-2">Input</h3>
                                        <div className="bg-muted p-2 rounded-lg">
                                            <MemoizedMarkdown
                                                content={currentProblem.inputFormat}
                                                id={`problem-${currentProblem.id}-input`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">Output</h3>
                                        <div className="bg-muted p-2 rounded-lg">
                                            <MemoizedMarkdown
                                                content={currentProblem.outputFormat}
                                                id={`problem-${currentProblem.id}-output`}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Examples */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-3">Examples</h3>
                                    {currentProblem.examples.map((example, index) => (
                                        <div key={index} className="mb-4 bg-muted p-2 rounded-lg">
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="font-medium text-base text-foreground">Input:</span>
                                                    <div className="mt-1 p-1 bg-background rounded-md font-mono text-sm">
                                                        {example.input}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-base text-foreground">Output:</span>
                                                    <div className="mt-1 p-1 bg-background rounded-md font-mono text-sm">
                                                        {example.output}
                                                    </div>
                                                </div>
                                                {example.explanation && (
                                                    <div>
                                                        <span className="font-medium text-base text-foreground">Explanation:</span>
                                                        <div className="mt-1">
                                                            <MemoizedMarkdown
                                                                content={example.explanation}
                                                                id={`problem-${currentProblem.id}-example-${index}`}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Constraints */}
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-3">Constraints</h3>
                                    <ul className="space-y-2">
                                        {currentProblem.constraints.map((constraint, index) => (
                                            <li key={index} className="text-base text-muted-foreground flex items-start">
                                                <span className="mr-2">•</span>
                                                <MemoizedMarkdown
                                                    content={constraint}
                                                    id={`problem-${currentProblem.id}-constraint-${index}`}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </TabsContent>

                            <TabsContent value="hints" className="space-y-4 mt-0">
                                {currentProblem.hints.map((hint, index) => (
                                    <div key={index} className="p-2 bg-muted rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb size={16} className="text-muted-foreground mt-1 flex-shrink-0" />
                                            <MemoizedMarkdown
                                                content={hint}
                                                id={`problem-${currentProblem.id}-hint-${index}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </TabsContent>

                            <TabsContent value="companies" className="space-y-4 mt-0">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-3">Companies</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {currentProblem.companies.map((company, index) => (
                                            <Badge key={index} variant="outline" className="text-sm">
                                                <Building size={12} className="mr-1" />
                                                {company}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-foreground mb-3">Related Topics</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {currentProblem.tags.map((tag, index) => (
                                            <Badge key={index} variant="secondary" className="text-sm">
                                                <Tag size={12} className="mr-1" />
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

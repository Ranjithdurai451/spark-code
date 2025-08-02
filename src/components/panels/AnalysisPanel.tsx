"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, RotateCcw, AlertCircle, Code2, Sparkles, Zap, Target, TrendingUp, Shield, Clock, Lightbulb, Maximize2, Copy, CheckCheck } from "lucide-react";
import { MemoizedMarkdown } from "@/components/MemoizedMarkdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";

interface AnalysisPanelProps {
    error: Error | null;
    latestAnalysis: any;
    isAnalyzing: boolean;
    status: string;
    onClear: () => void;
    onReload: () => void;
}

export function AnalysisPanel({
    error,
    latestAnalysis,
    isAnalyzing,
    status,
    onClear,
    onReload
}: AnalysisPanelProps) {
    const [showMaximizedView, setShowMaximizedView] = useState(false);
    const [copied, setCopied] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Improved auto-scroll during streaming
    useEffect(() => {
        if (isAnalyzing && latestAnalysis?.content) {
            // Use requestAnimationFrame for smoother scrolling
            requestAnimationFrame(() => {
                if (scrollViewportRef.current) {
                    scrollViewportRef.current.scrollTo({
                        top: scrollViewportRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            });
        }
    }, [latestAnalysis?.content, isAnalyzing]);

    const handleCopyAnalysis = async () => {
        if (latestAnalysis?.content) {
            try {
                await navigator.clipboard.writeText(latestAnalysis.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div
                        ref={scrollViewportRef}
                        className="h-full"
                    >
                        <div className="p-4 space-y-4 min-h-full">
                            {error ? (
                                <Card className="border-destructive/50 bg-destructive/5">
                                    <CardHeader className="text-center pb-4">
                                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                                            <AlertCircle className="w-6 h-6 text-destructive" />
                                        </div>
                                        <CardTitle className="text-destructive">Analysis Failed</CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            Unable to analyze the current code
                                        </p>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                            <p className="text-sm text-destructive font-medium mb-1">Error Details:</p>
                                            <p className="text-sm text-destructive/80">{error.message}</p>
                                        </div>

                                        <Button
                                            onClick={onReload}
                                            variant="outline"
                                            size="sm"
                                            className="w-full rounded-lg"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Try Again
                                        </Button>

                                        <div className="space-y-3">
                                            <Separator />
                                            <div>
                                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                                    <Target className="w-4 h-4" />
                                                    Tips for Better Analysis
                                                </h4>
                                                <ul className="text-sm text-muted-foreground space-y-1.5">
                                                    <li className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                                        Write complete functions with logic and parameters
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                                        Include classes with implemented methods
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                                        Add algorithms with loops and conditions
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                                        Avoid empty classes or simple print statements
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : latestAnalysis ? (
                                <div className="space-y-4">
                                    {/* Analysis Header - Only show when complete */}
                                    {!isAnalyzing && (
                                        <Card className="border-primary/20 bg-primary/5">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-primary/10">
                                                            <Sparkles className="w-5 h-5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-base">Expert Analysis Complete</CardTitle>
                                                            <p className="text-sm text-muted-foreground">Concise professional insights</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="rounded-full">
                                                            <Zap className="w-3 h-3 mr-1" />
                                                            Expert Level
                                                        </Badge>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setShowMaximizedView(true)}
                                                            className="rounded-lg"
                                                        >
                                                            <Maximize2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                        </Card>
                                    )}

                                    {/* Streaming Content */}
                                    <Card className="min-h-[200px]">
                                        <CardContent className="p-4">
                                            <div
                                                ref={contentRef}
                                                className="prose prose-sm max-w-none
                                                    prose-headings:text-foreground prose-headings:font-semibold prose-headings:text-sm prose-headings:mb-3 prose-headings:mt-4
                                                    prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-sm prose-p:mb-3
                                                    prose-strong:text-foreground prose-strong:font-medium
                                                    prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-1 prose-code:rounded prose-code:text-xs
                                                    prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:text-xs prose-pre:p-3 prose-pre:overflow-x-auto
                                                    prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-3 prose-blockquote:my-3
                                                    prose-ul:text-muted-foreground prose-li:text-muted-foreground prose-ul:text-sm prose-li:text-sm prose-li:mb-1 prose-li:leading-relaxed
                                                    prose-ol:text-muted-foreground prose-ol:text-sm
                                                    prose-h1:text-base prose-h1:border-b prose-h1:border-border prose-h1:pb-2
                                                    prose-h2:text-base prose-h2:flex prose-h2:items-center prose-h2:gap-2
                                                    prose-h3:text-sm prose-h3:text-primary prose-h3:font-medium
                                                    prose-h4:text-sm prose-h4:text-muted-foreground
                                                    dark:prose-invert
                                                    [&>*]:animate-in [&>*]:fade-in-50 [&>*]:duration-300"
                                            >
                                                <MemoizedMarkdown
                                                    content={latestAnalysis.content || ''}
                                                    id={`analysis-${latestAnalysis.id || Date.now()}`}
                                                />

                                                {/* Streaming indicator */}
                                                {isAnalyzing && (
                                                    <div className="flex items-center gap-2 text-muted-foreground mt-4 animate-pulse">
                                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                                        <span className="text-xs ml-2">AI thinking...</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions - Only show when complete */}
                                            {!isAnalyzing && latestAnalysis && (
                                                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                                                    <p className="text-xs text-muted-foreground">
                                                        Click maximize for detailed view
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleCopyAnalysis}
                                                            className="rounded-lg text-xs"
                                                        >
                                                            {copied ? (
                                                                <CheckCheck className="w-3 h-3 mr-1" />
                                                            ) : (
                                                                <Copy className="w-3 h-3 mr-1" />
                                                            )}
                                                            {copied ? 'Copied!' : 'Copy'}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setShowMaximizedView(true)}
                                                            className="rounded-lg text-xs"
                                                        >
                                                            <Maximize2 className="w-3 h-3 mr-1" />
                                                            Maximize
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Welcome Card */}
                                    <Card className="text-center">
                                        <CardHeader className="pb-4">
                                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                                <Brain className="w-8 h-8 text-primary" />
                                            </div>
                                            <CardTitle className="text-xl">Ready for Expert Analysis</CardTitle>
                                            <p className="text-muted-foreground">
                                                Get concise, actionable insights about your code from senior engineers
                                            </p>
                                        </CardHeader>
                                    </Card>

                                    {/* Features Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            {
                                                icon: Clock,
                                                title: "Complexity",
                                                description: "Time & space analysis"
                                            },
                                            {
                                                icon: TrendingUp,
                                                title: "Optimization",
                                                description: "Performance improvements"
                                            },
                                            {
                                                icon: Shield,
                                                title: "Quality Score",
                                                description: "Professional rating"
                                            },
                                            {
                                                icon: Code2,
                                                title: "Better Solutions",
                                                description: "Alternative approaches"
                                            }
                                        ].map(({ icon: Icon, title, description }, index) => (
                                            <Card key={index} className="border-muted">
                                                <CardContent className="p-1">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-1.5 rounded-md bg-muted">
                                                            <Icon className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-sm">{title}</h4>
                                                            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Call to Action */}
                                    <Card className="bg-muted/50">
                                        <CardContent className="p-2 text-center">
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Perfect for interviews, code reviews, and skill improvement
                                            </p>
                                            <p className="text-xs font-medium">
                                                Click <Badge variant="secondary" className="mx-1">Analyze Code</Badge> to get started
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Fixed Streaming Status */}
                            {isAnalyzing && (
                                <Card className="border-primary/20 bg-primary/5">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">AI Analyzing Your Code</p>
                                                <p className="text-xs text-muted-foreground">Generating expert insights in real-time</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Footer Actions */}
            {/* {latestAnalysis && !isAnalyzing && (
                <div className="border-t p-3 bg-background">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="w-full rounded-lg"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        New Analysis
                    </Button>
                </div>
            )} */}

            {/* Enhanced Maximized View Dialog */}
            <Dialog open={showMaximizedView} onOpenChange={setShowMaximizedView}>
                <DialogContent className="min-w-[60vw] max-h-[95vh] w-full rounded-xl">
                    <DialogHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Brain className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Expert Code Analysis</h2>
                                    <p className="text-sm text-muted-foreground font-normal">Full detailed view</p>
                                </div>
                            </DialogTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyAnalysis}
                                className="rounded-lg mt-5 mr-5"
                            >
                                {copied ? (
                                    <>
                                        <CheckCheck className="w-4 h-4 mr-2" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Analysis
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="max-h-[calc(95vh-140px)] pr-4">
                        <div className="space-y-6">
                            {latestAnalysis && (
                                <div className="prose prose-lg max-w-none
                                    prose-headings:text-foreground prose-headings:font-semibold prose-headings:scroll-mt-6
                                    prose-p:text-muted-foreground prose-p:leading-relaxed
                                    prose-strong:text-foreground prose-strong:font-semibold
                                    prose-code:bg-muted prose-code:text-foreground prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                                    prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto
                                    prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:py-4 prose-blockquote:px-4
                                    prose-ul:text-muted-foreground prose-li:text-muted-foreground prose-li:leading-relaxed
                                    prose-ol:text-muted-foreground
                                    prose-h1:text-2xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6
                                    prose-h2:text-xl prose-h2:flex prose-h2:items-center prose-h2:gap-3 prose-h2:mt-8 prose-h2:mb-4
                                    prose-h3:text-lg prose-h3:text-primary prose-h3:mt-6 prose-h3:mb-3
                                    prose-h4:text-base prose-h4:text-muted-foreground prose-h4:mt-4 prose-h4:mb-2
                                    dark:prose-invert"
                                >
                                    <MemoizedMarkdown
                                        content={latestAnalysis.content}
                                        id={`analysis-maximized-${Date.now()}`}
                                    />
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}

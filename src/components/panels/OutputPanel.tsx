"use client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, RotateCcw, Terminal, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface OutputPanelProps {
    output: string;
    onClear: () => void;
}

export function OutputPanel({ output, onClear }: OutputPanelProps) {
    const isRunning = output.includes("🚀 Running your code...");
    const hasError = output.includes("❌ Error:");
    const isSuccess = output.includes("✅ Code executed successfully");

    const getOutputStatus = () => {
        if (isRunning) return { icon: Clock, label: "Running", variant: "secondary" as const };
        if (hasError) return { icon: XCircle, label: "Error", variant: "destructive" as const };
        if (isSuccess) return { icon: CheckCircle, label: "Success", variant: "default" as const };
        return null;
    };

    const status = getOutputStatus();

    return (
        <div className="h-full flex flex-col">
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {output ? (
                        <div className="space-y-4">
                            {/* Output Header */}
                            <Card className="border shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Terminal className="w-4 h-4 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">Execution Output</CardTitle>
                                                <p className="text-sm text-muted-foreground">Code execution results</p>
                                            </div>
                                        </div>
                                        {status && (
                                            <Badge variant={status.variant} className="rounded-full">
                                                <status.icon className="w-3 h-3 mr-1" />
                                                {status.label}
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                            </Card>

                            {/* Output Content */}
                            <Card>
                                <CardContent className="p-0">
                                    <div className={`p-4 rounded-lg font-mono text-sm whitespace-pre-wrap break-words ${hasError
                                        ? "bg-destructive/5 border border-destructive/20 text-destructive"
                                        : isSuccess
                                            ? "bg-primary/5 border border-primary/20"
                                            : "bg-muted/50"
                                        }`}>
                                        {output}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Output Actions */}
                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Terminal className="w-4 h-4" />
                                            <span>Output ready</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onClear}
                                            className="rounded-lg"
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Clear Output
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Welcome Card */}
                            <Card className="text-center">
                                <CardHeader className="pb-4">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                        <Play className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-xl">Ready to Execute</CardTitle>
                                    <p className="text-muted-foreground">
                                        Run your code to see the execution output and results
                                    </p>
                                </CardHeader>
                            </Card>

                            {/* Features */}
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    {
                                        icon: Terminal,
                                        title: "Real-time Output",
                                        description: "See your code execution results instantly"
                                    },
                                    {
                                        icon: CheckCircle,
                                        title: "Success Detection",
                                        description: "Automatic success and error detection"
                                    },
                                    {
                                        icon: Clock,
                                        title: "Execution Tracking",
                                        description: "Monitor your code execution progress"
                                    }
                                ].map(({ icon: Icon, title, description }, index) => (
                                    <Card key={index} className="border-muted">
                                        <CardContent className="p-3">
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
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Ready to test your code implementation
                                    </p>
                                    <p className="text-xs font-medium">
                                        Click <Badge variant="secondary" className="mx-1">Run Code</Badge> to execute
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

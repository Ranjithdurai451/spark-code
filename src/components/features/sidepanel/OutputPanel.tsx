"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Terminal, RotateCcw, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OutputPanelProps {
    output: string;
    onClear: () => void;
}

function useOutputStatus(output: string) {
    if (output.includes("🚀 Running")) return { icon: Clock, label: "Running", variant: "secondary" as const };
    if (output.includes("❌ Error")) return { icon: XCircle, label: "Error", variant: "destructive" as const };
    if (output.includes("✅")) return { icon: CheckCircle, label: "Success", variant: "default" as const };
    return null;
}

export function OutputPanel({ output, onClear }: OutputPanelProps) {
    const status = useOutputStatus(output);

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-4">
                    {output ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Output</span>
                                </div>
                                {status && (
                                    <Badge variant={status.variant} className="text-xs">
                                        <status.icon className="w-3 h-3 mr-1" />
                                        {status.label}
                                    </Badge>
                                )}
                            </div>

                            {/* Output Display */}
                            <Card>
                                <CardContent className="p-0">
                                    <pre className={`
                                        p-4 font-mono text-sm whitespace-pre-wrap break-words
                                        max-h-96 overflow-auto
                                        ${status?.variant === 'destructive'
                                            ? 'bg-destructive/5 text-destructive border border-destructive/20'
                                            : status?.variant === 'default'
                                                ? 'bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100'
                                                : 'bg-muted text-foreground'
                                        }
                                    `}>
                                        {output}
                                    </pre>
                                </CardContent>
                            </Card>

                            {/* Clear Button */}
                            <div className="flex justify-end">
                                <Button variant="ghost" size="sm" onClick={onClear}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Clear
                                </Button>
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Terminal className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">Ready to Execute</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Run your code to see the execution output here
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// components/MobileNotSupported.tsx
"use client";
import { Monitor, Smartphone, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export default function MobileNotSupported() {
    const handleRefresh = () => {
        if (typeof window !== "undefined") {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Monitor className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Desktop Required</CardTitle>
                    <CardDescription className="text-base">
                        SparkCode is optimized for desktop development experience.
                        Please access this application on a larger screen (1024px+) for the best coding experience.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Smartphone className="w-4 h-4" />
                        <span>Mobile view not supported</span>
                    </div>

                    {/* Helpful suggestions */}
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>Try:</p>
                        <ul className="text-left space-y-1">
                            <li>• Using a desktop or laptop</li>
                            <li>• Rotating your tablet to landscape</li>
                            <li>• Using a larger tablet (12" or more)</li>
                        </ul>
                    </div>

                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        className="w-full"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Refresh Page
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

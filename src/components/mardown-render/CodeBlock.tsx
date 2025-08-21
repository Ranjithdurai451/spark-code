"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/utils";
import {
    AlignLeft,
    CheckIcon,
    ChevronDown,
    ChevronUp,
    CopyIcon,
    WrapText,
    Code2
} from "lucide-react";
import { memo, useMemo, useState, useCallback } from "react";
import { useCodeHighlighter } from "./useCodeHighlighter";
import { useEditorStore, createNewTab, getLanguageConfig, Language } from "../features/editor/editorStore";

export const Codeblock = memo(
    ({
        node,
        inline,
        className,
        children,
        disable,
        default: defaultProps,
        ...props
    }: {
        node?: any;
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
        disable?: {
            copy?: boolean;
            expand?: boolean;
            wrap?: boolean;
            embed?: boolean;
        };
        default?: {
            expand?: boolean;
            wrap?: boolean;
        };
    }) => {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "plaintext";

        // Store actions
        const { addTab } = useEditorStore();

        // Calculate total lines and visible lines - memoized to prevent recalculation during streaming
        const [totalLines, visibleLines] = useMemo(() => {
            const codeText = [...(Array.isArray(children) ? children : [children])]
                .filter((x: any) => typeof x === "string")
                .join("");

            const lines = codeText.split('\n');
            const total = lines.length;
            const visible = defaultProps?.expand ? total : Math.min(total, 17);

            return [total, visible];
        }, [children, defaultProps?.expand]);

        const isMultiLine = totalLines > 1;
        const [didRecentlyCopied, setDidRecentlyCopied] = useState(false);
        const [didRecentlyEmbedded, setDidRecentlyEmbedded] = useState(false);
        const [expanded, setExpanded] = useState(defaultProps?.expand ?? false);
        const [wrapped, setWrapped] = useState(defaultProps?.wrap ?? false);

        // Stable code string - prevents re-renders during streaming
        const codeString = useMemo(() => {
            return [...(Array.isArray(children) ? children : [children])]
                .filter((x: any) => typeof x === "string")
                .join("");
        }, [children]);

        const { highlightedCode } = useCodeHighlighter({
            codeString,
            language,
            expanded,
            wrapped,
            inline,
            shouldHighlight: !inline && (!!match || isMultiLine)
        });

        // Handle embed action
        const handleEmbed = useCallback(() => {
            if (!codeString.trim()) return;

            // Map common language aliases to store languages
            const languageMap: Record<string, Language> = {
                'js': 'javascript',
                'ts': 'typescript',
                'py': 'python',
                'cpp': 'cpp',
                'c++': 'cpp',
                'java': 'java',
                'go': 'go',
                'c': 'c'
            };

            const mappedLanguage = languageMap[language.toLowerCase()] || 'javascript';
            const config = getLanguageConfig(mappedLanguage);

            // Create new tab with the code
            const newTab = {
                name: `${config.displayName} Code`,
                language: mappedLanguage,
                code: codeString,
                isDirty: true,
                createdAt: Date.now(),
                lastModified: Date.now(),
            };

            addTab(newTab);

            // Show feedback
            setDidRecentlyEmbedded(true);
            setTimeout(() => {
                setDidRecentlyEmbedded(false);
            }, 1500);
        }, [codeString, language, addTab]);

        // Handle copy action with feedback
        const handleCopy = useCallback(() => {
            copyToClipboard(codeString);
            setDidRecentlyCopied(true);
            setTimeout(() => {
                setDidRecentlyCopied(false);
            }, 1000);
        }, [codeString]);

        if (!children) return null;

        return !inline && (match || isMultiLine) ? (
            <div className="relative mt-1 mb-1 flex flex-col overflow-hidden rounded-lg border border-border">
                {/* Toolbar */}
                <div className="flex items-center gap-2 rounded-t-md border-border border-b bg-muted px-2 py-1 shrink-0">
                    <span className="pl-2 font-mono text-muted-foreground text-xs">
                        {language}
                    </span>
                    {totalLines >= 16 && (
                        <span className="pt-0.5 pl-2 font-mono text-muted-foreground/50 text-xs">
                            {totalLines} lines
                        </span>
                    )}
                    <div className="flex-grow" />

                    {/* Embed Button */}
                    {!disable?.embed && codeString.trim() && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={handleEmbed}
                                >
                                    {didRecentlyEmbedded ? (
                                        <CheckIcon className="!size-4 text-green-500" />
                                    ) : (
                                        <Code2 className="!size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {didRecentlyEmbedded ? "Added to Editor!" : "Embed in Editor"}
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Expand/Collapse Button */}
                    {totalLines >= 16 && !disable?.expand && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setExpanded((t) => !t)}
                                >
                                    {expanded ? (
                                        <ChevronUp className="!size-4" />
                                    ) : (
                                        <ChevronDown className="!size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {expanded ? "Collapse" : "Expand"}
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Word Wrap Button */}
                    {!disable?.wrap && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setWrapped((t) => !t)}
                                >
                                    {wrapped ? (
                                        <WrapText className="!size-4" />
                                    ) : (
                                        <AlignLeft className="!size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {wrapped ? "Unwrap lines" : "Wrap lines"}
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {/* Copy Button */}
                    {!disable?.copy && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={handleCopy}
                                >
                                    {didRecentlyCopied ? (
                                        <CheckIcon className="size-4 text-green-500" />
                                    ) : (
                                        <CopyIcon className="size-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {didRecentlyCopied ? "Copied!" : "Copy code"}
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>

                {/* Code Content */}
                <div className="relative min-h-0 flex-1">
                    <div
                        className={cn(
                            "overflow-auto max-w-full",
                            wrapped ? "overflow-x-hidden" : "overflow-x-auto",
                            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-border/80"
                        )}
                        style={{
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgb(156 163 175) transparent'
                        }}
                    >
                        <div
                            key={`${codeString.length}-${expanded}-${wrapped}`} // Stable key to prevent unnecessary re-renders
                            dangerouslySetInnerHTML={{ __html: highlightedCode }}
                            className={cn(
                                "shiki-container pl-2 font-mono transition-all duration-200",
                                !wrapped && "whitespace-nowrap",
                                wrapped ? "max-w-full" : "min-w-max",
                                !expanded && "max-h-[17em] overflow-hidden"
                            )}
                        />
                    </div>

                    {/* Expand Button Overlay */}
                    {!expanded && totalLines > 17 && (
                        <div className="absolute right-0 bottom-0 left-0 flex h-12 justify-center rounded-b-md bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setExpanded(true)}
                                className="h-[1.5rem] gap-1.5 rounded-md shadow-lg pointer-events-auto hover:shadow-xl transition-all duration-200"
                            >
                                {totalLines - 17} more lines
                                <ChevronDown className="!size-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <code
                className={cn(
                    className,
                    "rounded-md border border-primary/20 bg-primary/10 px-1 py-0.5 font-medium font-mono text-foreground/80 text-sm leading-4"
                )}
                {...props}
            >
                {children}
            </code>
        );
    }
);

Codeblock.displayName = "Codeblock";

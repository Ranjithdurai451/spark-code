"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCodeHighlighter } from "@/hooks/useCodeHighlighter";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/utils";
import { AlignLeft, CheckIcon, ChevronDown, ChevronUp, CopyIcon, WrapText } from "lucide-react";
import { memo, useMemo, useState } from "react";

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
        };
        default?: {
            expand?: boolean;
            wrap?: boolean;
        };
    }) => {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "plaintext";

        // Calculate total lines and visible lines
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
        const [expanded, setExpanded] = useState(defaultProps?.expand ?? false);
        const [wrapped, setWrapped] = useState(defaultProps?.wrap ?? false);

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

        if (!children) return null;

        return !inline && (match || isMultiLine) ? (
            <div className="relative mt-1 mb-1 flex flex-col overflow-hidden rounded-lg border border-border">
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

                    {totalLines >= 16 && !disable?.expand && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground"
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
                    {!disable?.wrap && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground"
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
                    {!disable?.copy && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[1.5rem] w-[1.5rem] text-muted-foreground"
                                    onClick={() => {
                                        copyToClipboard(codeString);
                                        setDidRecentlyCopied(true);
                                        setTimeout(() => {
                                            setDidRecentlyCopied(false);
                                        }, 1000);
                                    }}
                                >
                                    {didRecentlyCopied ? (
                                        <CheckIcon className="size-4" />
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
                            dangerouslySetInnerHTML={{ __html: highlightedCode }}
                            className={cn(
                                "shiki-container pl-2 font-mono",
                                !wrapped && "whitespace-nowrap",
                                wrapped ? "max-w-full" : "min-w-max",
                                !expanded && "max-h-[17em] overflow-hidden"
                            )}
                        />
                    </div>

                    {!expanded && totalLines > 17 && (
                        <div className="absolute right-0 bottom-0 left-0 flex h-12 justify-center rounded-b-md bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent pointer-events-none">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => setExpanded(true)}
                                className="h-[1.5rem] gap-1.5 rounded-md shadow-lg pointer-events-auto"
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
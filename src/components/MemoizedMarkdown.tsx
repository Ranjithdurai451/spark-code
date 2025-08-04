"use client";
import type { Schema } from "hast-util-sanitize";
import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { Codeblock } from "./CodeBlock";

// Keep your existing sanitizeSchema and parseMarkdownIntoBlocks functions
const sanitizeSchema: Schema = {
    tagNames: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "blockquote", "ul", "ol", "li",
        "strong", "em", "del", "code", "pre",
        "hr", "br", "a", "img", "table",
        "thead", "tbody", "tr", "th", "td",
        "div", "span", "section"
    ],
    attributes: {
        "*": ["className", "id", "data-theme"],
        a: ["href", "title", "target", "rel"],
        img: ["src", "alt", "title", "width", "height"],
        div: ["className", "id"],
        span: ["className", "id"]
    },
    protocols: {
        href: ["http", "https", "mailto"],
        src: ["http", "https"]
    }
};
function parseMarkdownIntoBlocks(markdown: string): string[] {
    const tokens = marked.lexer(markdown);
    return tokens.map((token) => token.raw);
}


const MemoizedMarkdownBlock = memo(
    ({ content }: { content: string }) => {
        return (
            <ReactMarkdown
                remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
                rehypePlugins={[
                    [rehypeSanitize, sanitizeSchema],
                    [rehypeKatex, { output: "html" }]
                ]}
                components={{
                    code: Codeblock,
                    h1: ({ children, ...props }) => (
                        <h1 className="text-lg font-semibold mb-3 text-foreground border-b border-border pb-2 mt-4" {...props}>
                            {children}
                        </h1>
                    ),
                    h2: ({ children, ...props }) => (
                        <h2 className="text-base font-semibold mb-2 text-foreground mt-3" {...props}>
                            {children}
                        </h2>
                    ),
                    h3: ({ children, ...props }) => (
                        <h3 className="text-sm font-medium mb-2 text-primary mt-3" {...props}>
                            {children}
                        </h3>
                    ),
                    h4: ({ children, ...props }) => (
                        <h4 className="text-sm font-medium mb-1 text-foreground mt-2" {...props}>
                            {children}
                        </h4>
                    ),
                    p: ({ children, ...props }) => (
                        <p className="mb-3 leading-relaxed text-sm text-muted-foreground" {...props}>
                            {children}
                        </p>
                    ),
                    ul: ({ children, ...props }) => (
                        <ul className="list-disc list-inside mb-3 space-y-1 pl-4 text-sm text-muted-foreground" {...props}>
                            {children}
                        </ul>
                    ),
                    ol: ({ children, ...props }) => (
                        <ol className="list-decimal list-inside mb-3 space-y-1 pl-4 text-sm text-muted-foreground" {...props}>
                            {children}
                        </ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li className="text-sm leading-relaxed text-muted-foreground" {...props}>
                            {children}
                        </li>
                    ),
                    blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-3 border-primary pl-4 py-2 mb-3 bg-muted/50 rounded-r" {...props}>
                            <div className="text-muted-foreground italic text-sm">
                                {children}
                            </div>
                        </blockquote>
                    ),
                    strong: ({ children, ...props }) => (
                        <strong className="font-semibold text-foreground" {...props}>
                            {children}
                        </strong>
                    ),
                    // Keep other components similar but with text-sm instead of text-lg
                }}
            >
                {content}
            </ReactMarkdown>
        );
    }
);

export const MemoizedMarkdown = memo(({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
        <div className="prose prose-sm max-w-none break-words">
            {blocks.map((block, index) => (
                <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
            ))}
        </div>
    );
});

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
                        <ul className="list-disc list-inside mb-3 space-y-2 pl-4 text-sm text-muted-foreground" {...props}>
                            {children}
                        </ul>
                    ),
                    ol: ({ children, ...props }) => (
                        <ol className="mb-3 space-y-3 pl-0 text-sm text-muted-foreground" {...props}>
                            {children}
                        </ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li className="text-sm leading-relaxed text-muted-foreground mb-1" {...props}>
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
                    em: ({ children, ...props }) => (
                        <em className="italic text-muted-foreground" {...props}>
                            {children}
                        </em>
                    ),
                    del: ({ children, ...props }) => (
                        <del className="line-through text-muted-foreground/70" {...props}>
                            {children}
                        </del>
                    ),
                    a: ({ children, ...props }) => (
                        <a className="text-primary hover:text-primary/80 underline underline-offset-2" {...props}>
                            {children}
                        </a>
                    ),
                    img: ({ ...props }) => (
                        <img className="max-w-full h-auto rounded-md my-2" {...props} />
                    ),
                    table: ({ children, ...props }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-border text-sm" {...props}>
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children, ...props }) => (
                        <thead className="bg-muted" {...props}>
                            {children}
                        </thead>
                    ),
                    tbody: ({ children, ...props }) => (
                        <tbody {...props}>
                            {children}
                        </tbody>
                    ),
                    tr: ({ children, ...props }) => (
                        <tr className="border-b border-border" {...props}>
                            {children}
                        </tr>
                    ),
                    th: ({ children, ...props }) => (
                        <th className="border border-border px-3 py-2 text-left font-medium text-foreground" {...props}>
                            {children}
                        </th>
                    ),
                    td: ({ children, ...props }) => (
                        <td className="border border-border px-3 py-2 text-muted-foreground" {...props}>
                            {children}
                        </td>
                    ),
                    hr: ({ ...props }) => (
                        <hr className="my-4 border-border" {...props} />
                    ),
                    pre: ({ children, ...props }) => (
                        <pre className="mb-3 overflow-x-auto" {...props}>
                            {children}
                        </pre>
                    ),
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

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";
MemoizedMarkdown.displayName = "MemoizedMarkdown";

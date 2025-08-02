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

// Custom sanitization schema
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
                        <h1 className="text-5xl font-bold mb-8 text-foreground border-b border-border pb-4 mt-10" {...props}>
                            {children}
                        </h1>
                    ),
                    h2: ({ children, ...props }) => (
                        <h2 className="text-4xl font-semibold mb-6 text-foreground mt-10 border-b border-border pb-3" {...props}>
                            {children}
                        </h2>
                    ),
                    h3: ({ children, ...props }) => (
                        <h3 className="text-3xl font-semibold mb-4 text-foreground mt-8" {...props}>
                            {children}
                        </h3>
                    ),
                    h4: ({ children, ...props }) => (
                        <h4 className="text-2xl font-semibold mb-3 text-foreground mt-6" {...props}>
                            {children}
                        </h4>
                    ),
                    h5: ({ children, ...props }) => (
                        <h5 className="text-xl font-semibold mb-2 text-foreground mt-5" {...props}>
                            {children}
                        </h5>
                    ),
                    h6: ({ children, ...props }) => (
                        <h6 className="text-lg font-medium mb-2 text-foreground mt-4" {...props}>
                            {children}
                        </h6>
                    ),
                    p: ({ children, ...props }) => (
                        <p className="mb-6 leading-relaxed text-lg text-foreground" {...props}>
                            {children}
                        </p>
                    ),
                    ul: ({ children, ...props }) => (
                        <ul className="list-disc list-inside mb-6 space-y-3 pl-6 text-lg text-foreground" {...props}>
                            {children}
                        </ul>
                    ),
                    ol: ({ children, ...props }) => (
                        <ol className="list-decimal list-inside mb-6 space-y-3 pl-6 text-lg text-foreground" {...props}>
                            {children}
                        </ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li className="text-lg leading-relaxed text-foreground" {...props}>
                            {children}
                        </li>
                    ),
                    blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-4 border-border pl-8 py-3 mb-6 bg-muted rounded-r-lg" {...props}>
                            <div className="text-muted-foreground italic text-lg">
                                {children}
                            </div>
                        </blockquote>
                    ),
                    hr: ({ ...props }) => (
                        <hr className="my-10 border-border" {...props} />
                    ),
                    a: ({ children, href, ...props }) => (
                        <a
                            href={href}
                            className="text-foreground underline hover:text-muted-foreground transition-colors text-lg"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                        >
                            {children}
                        </a>
                    ),
                    strong: ({ children, ...props }) => (
                        <strong className="font-bold text-foreground text-lg" {...props}>
                            {children}
                        </strong>
                    ),
                    em: ({ children, ...props }) => (
                        <em className="italic text-foreground text-lg" {...props}>
                            {children}
                        </em>
                    ),
                    del: ({ children, ...props }) => (
                        <del className="line-through text-muted-foreground text-lg" {...props}>
                            {children}
                        </del>
                    ),
                    table: ({ children, ...props }) => (
                        <div className="overflow-x-auto mb-8">
                            <table className="min-w-full border-collapse border border-border rounded-lg text-lg" {...props}>
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children, ...props }) => (
                        <thead className="bg-muted text-lg" {...props}>
                            {children}
                        </thead>
                    ),
                    tbody: ({ children, ...props }) => (
                        <tbody className="text-lg" {...props}>
                            {children}
                        </tbody>
                    ),
                    tr: ({ children, ...props }) => (
                        <tr className="border-b border-border hover:bg-muted/50 transition-colors text-lg" {...props}>
                            {children}
                        </tr>
                    ),
                    th: ({ children, ...props }) => (
                        <th className="border border-border px-6 py-4 text-left font-semibold text-foreground bg-muted text-lg" {...props}>
                            {children}
                        </th>
                    ),
                    td: ({ children, ...props }) => (
                        <td className="border border-border px-6 py-4 text-foreground text-lg" {...props}>
                            {children}
                        </td>
                    ),
                    img: ({ src, alt, ...props }) => (
                        <img
                            src={src}
                            alt={alt}
                            className="max-w-full h-auto rounded-lg border border-border my-6"
                            {...props}
                        />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        );
    },
    (prevProps, nextProps) => {
        return prevProps.content === nextProps.content;
    }
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
        <div className="prose max-w-none dark:prose-invert" style={{ fontSize: "1.25rem", lineHeight: "2rem" }}>
            {blocks.map((block, index) => (
                <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
            ))}
        </div>
    );
});

MemoizedMarkdown.displayName = "MemoizedMarkdown";

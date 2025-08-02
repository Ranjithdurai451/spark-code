export const TextRenderer = (
    text: string,
): React.ReactNode[] => {
    if (!text || typeof text !== "string") return [];

    // Enhanced regex pattern handling multiple formatting options
    // Handles nested formatting more accurately
    const segments = text
        .split(/((?:\*\*[^*]+\*\*)|(?:\*[^*\s][^*]*[^*\s]\*)|(?:`[^`]+`)|(?:\n))/g)
        .filter(Boolean);

    return segments.map((segment, index) => {
        // Handle newlines for better whitespace preservation
        if (segment === "\n") {
            return <br key={`br-${index}`} />;
        }

        // Bold text with **text**
        const boldMatch = segment.match(/^\*\*(.+?)\*\*$/);
        if (boldMatch) {
            return (
                <strong
                    key={`bold-${index}`}
                    className="font-semibold underline underline-offset-2 decoration-1"
                >
                    {boldMatch[1]}
                </strong>
            );
        }

        // Italic text with *text*
        const italicMatch = segment.match(/^\*(.+?)\*$/);
        if (italicMatch) {
            return <em key={`italic-${index}`}>{italicMatch[1]}</em>;
        }

        // Inline code with `code`
        const codeMatch = segment.match(/^`(.+?)`$/);
        if (codeMatch) {
            return (
                <code
                    key={`code-${index}`}
                    className="mx-1 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-sm"
                >
                    {codeMatch[1]}
                </code>
            );
        }

        // Regular text - Apply word wrapping for better readability
        return <span key={`text-${index}`}>{segment}</span>;
    });
};
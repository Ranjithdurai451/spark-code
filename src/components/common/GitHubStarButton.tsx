"use client";

import { useEffect, useState } from "react";
import { Github, Star } from "lucide-react";

type GitHubRepoResponse = {
    stargazers_count: number;
};

const REPO_URL = "https://github.com/Ranjithdurai451/spark-code";
const API_URL = "https://api.github.com/repos/Ranjithdurai451/spark-code";

const formatCount = (count: number): string => {
    if (count < 1000) return String(count);
    if (count < 10000) return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return Math.round(count / 1000) + "k";
};

const GitHubStarButton = () => {
    const [stars, setStars] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;
        const fetchStars = async () => {
            try {
                const response = await fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } });
                if (!response.ok) return;
                const data = (await response.json()) as GitHubRepoResponse;
                if (isMounted && typeof data.stargazers_count === "number") {
                    setStars(data.stargazers_count);
                }
            } catch {
                // ignore fetch errors silently
            }
        };
        fetchStars();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            aria-label="Star spark-code on GitHub"
            title="Star spark-code on GitHub"
        >
            <Github className="w-4 h-4" />
            <span>Star on GitHub</span>
            <span className="ml-1 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-foreground/70 border">
                <Star className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" />
                {stars !== null ? formatCount(stars) : "—"}
            </span>
        </a>
    );
};

export default GitHubStarButton;



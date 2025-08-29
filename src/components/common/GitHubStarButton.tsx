"use client";

import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const REPO_URL = "https://github.com/Ranjithdurai451/spark-code";

const GitHubStarButton = () => {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <a
                    href={REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on GitHub"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <Star className="h-4.5 w-4.5" />
                </a>
            </TooltipTrigger>
            <TooltipContent>
                Star on GitHub
            </TooltipContent>
        </Tooltip>
    );
};

export default GitHubStarButton;



import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      // Silently fail if clipboard operations are not supported
    }
    document.body.removeChild(textArea);
  }
};

// React Query utilities for efficient cache management
import { QueryClient } from "@tanstack/react-query";

/**
 * Efficiently invalidate all credits-related queries
 * This replaces multiple individual invalidateQueries calls
 */
export function invalidateCreditsQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const queryKey = query.queryKey;
      return (
        Array.isArray(queryKey) &&
        (queryKey.includes("credits") || queryKey.includes("credit-history"))
      );
    },
  });
}

/**
 * Invalidate credits queries with exact matching for better performance
 */
export function invalidateCreditsExact(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["credits"], exact: true }),
    queryClient.invalidateQueries({
      queryKey: ["credit-history"],
      exact: true,
    }),
  ]);
}

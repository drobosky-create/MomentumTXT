/**
 * Design System Utilities - Single Source of Truth
 * Helper functions and constants for the Momentum design system
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Re-export cn utility for design system consistency
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * KPI Change Utilities - For trend indicators and color coding
 */
type ChangeType = "positive" | "negative" | "neutral";

function getChangeType(change: number): ChangeType {
  if (change > 0) return "positive";
  if (change < 0) return "negative";
  return "neutral";
}

export function getChangeColor(change: number): string {
  const type = getChangeType(change);
  switch (type) {
    case "positive":
      return "change-positive";
    case "negative":
      return "change-negative";
    case "neutral":
      return "change-neutral";
  }
}

export function getChangeIcon(change: number): string {
  const type = getChangeType(change);
  switch (type) {
    case "positive":
      return "▲";
    case "negative":
      return "▼";
    case "neutral":
      return "→";
  }
}

/**
 * KPI Value Formatting - Consistent data display
 */
export type KPIFormat = "currency" | "percentage" | "number" | "rating" | "duration";

export function formatKPIValue(value: number | string, format: KPIFormat): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);

    case "percentage":
      return `${numValue.toFixed(1)}%`;

    case "number":
      return new Intl.NumberFormat("en-US").format(numValue);

    case "rating":
      return `${numValue.toFixed(1)}⭐`;

    case "duration":
      return `${numValue} days`;

    default:
      return String(value);
  }
}

/**
 * Color Utilities - Semantic color classes
 */
const semanticColors: Record<string, string> = {
  positive: "text-[hsl(var(--positive-growth))]",
  negative: "text-[hsl(var(--negative-decline))]",
  neutral: "text-[hsl(var(--neutral-stable))]",
  primary: "text-[hsl(var(--momentum-blue))]",
  accent: "text-[hsl(var(--momentum-green))]",
  warning: "text-[hsl(var(--momentum-red))]",
} as const;

// Retained for future use — referenced by semanticColors above
void semanticColors;

/**
 * Spacing Scale - Consistent layout values
 */
const spacing = {
  xs: "var(--space-1)",
  sm: "var(--space-2)",
  md: "var(--space-4)",
  lg: "var(--space-6)",
  xl: "var(--space-8)",
} as const;

// Retained for future use
void spacing;

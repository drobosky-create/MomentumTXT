import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const typographyVariants = cva(
  "", // Base classes applied to all variants
  {
    variants: {
      variant: {
        // Heading Styles
        h1: "scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl",
        h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
        h4: "scroll-m-20 text-xl font-semibold tracking-tight",

        // Body Text Styles
        body: "leading-7 [&:not(:first-child)]:mt-6",
        lead: "text-xl text-muted-foreground",
        large: "text-lg font-semibold",
        small: "text-sm font-medium leading-none",
        muted: "text-sm text-muted-foreground",

        // KPI-Specific Styles (Core to our platform)
        "kpi-value": "text-kpi-value text-foreground", // Uses CSS class from index.css
        "kpi-change": "text-kpi-change", // Uses CSS class from index.css
        "kpi-label": "text-kpi-label", // Uses CSS class from index.css

        // Special Purpose
        code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      },
    },
    defaultVariants: {
      variant: "body",
    },
  }
);

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType;
  children: React.ReactNode;
}

/**
 * Universal Typography Component - Single Source of Truth for Text Styling
 *
 * Usage Examples:
 * <Typography variant="h1">Page Title</Typography>
 * <Typography variant="kpi-value">$612k</Typography>
 * <Typography variant="kpi-change" className="change-positive">▲ 3.2%</Typography>
 * <Typography as="p" variant="body">Regular paragraph text</Typography>
 */
const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as, ...props }, ref) => {
    // Auto-select semantic HTML element based on variant
    const Component = as || getSemanticElement(variant);

    return (
      <Component className={cn(typographyVariants({ variant, className }))} ref={ref} {...props} />
    );
  }
);
Typography.displayName = "Typography";

/**
 * Helper function to automatically choose semantic HTML elements
 * This promotes accessibility and SEO best practices
 */
function getSemanticElement(variant: string | null | undefined): React.ElementType {
  switch (variant) {
    case "h1":
      return "h1";
    case "h2":
      return "h2";
    case "h3":
      return "h3";
    case "h4":
      return "h4";
    case "body":
    case "lead":
      return "p";
    case "kpi-value":
    case "kpi-change":
    case "large":
      return "span";
    case "code":
      return "code";
    default:
      return "span";
  }
}

export { Typography, typographyVariants };

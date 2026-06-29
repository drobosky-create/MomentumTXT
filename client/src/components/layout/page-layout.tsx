import * as React from "react";
import { cn } from "@/lib/design-system";
import { Typography } from "@/components/ui/typography";

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Universal Page Layout Component - Consistent page structure
 *
 * Provides consistent page headers, spacing, and responsive layout
 * across all authenticated pages in the application.
 *
 * Usage:
 * <PageLayout
 *   title="Dashboard"
 *   subtitle="Week 18, 2024 • Last updated 2 hours ago"
 *   actions={<Button>Add KPI</Button>}
 * >
 *   <KPIGrid />
 * </PageLayout>
 */
const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ title, subtitle, actions, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex-1 overflow-y-auto bg-background", className)} {...props}>
        {/* Page Header */}
        <PageHeader title={title} subtitle={subtitle} actions={actions} />

        {/* Page Content */}
        <div className="p-6 space-y-6">{children}</div>
      </div>
    );
  }
);
PageLayout.displayName = "PageLayout";

/**
 * Page Header Component - Consistent page titles and actions
 */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <header className="border-b border-border glass-card backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Typography
              variant="h1"
              className="text-2xl font-bold tracking-tight text-white"
              data-testid="page-title"
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="muted"
                className="text-muted-foreground opacity-70"
                data-testid="page-subtitle"
              >
                {subtitle}
              </Typography>
            )}
          </div>

          {actions && (
            <div className="flex items-center gap-2" data-testid="page-actions">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/**
 * Content Section Component - Consistent content blocks
 */
interface ContentSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

const ContentSection = React.forwardRef<HTMLElement, ContentSectionProps>(
  ({ title, description, children, className, ...props }, ref) => {
    return (
      <section ref={ref} className={cn("space-y-4", className)} {...props}>
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <Typography variant="h3" className="text-lg font-semibold">
                {title}
              </Typography>
            )}
            {description && <Typography variant="muted">{description}</Typography>}
          </div>
        )}
        {children}
      </section>
    );
  }
);
ContentSection.displayName = "ContentSection";

export { PageLayout, PageHeader, ContentSection };

import * as React from "react";
import { Card, CardContent } from "./card";
import { Typography } from "./typography";
import { cn } from "@/lib/design-system";
import { getChangeColor, getChangeIcon, formatKPIValue, type KPIFormat } from "@/lib/design-system";

interface KPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number | string;
  change?: number;
  trend?: "up" | "down" | "stable";
  format?: KPIFormat;
  unit?: string;
  sparklineData?: number[];
  className?: string;
}

/**
 * Universal KPI Card Component - Core to Momentum Design System
 *
 * This component displays key performance indicators with consistent styling,
 * trend indicators, and change percentages. It's the visual heart of the dashboard.
 *
 * Usage:
 * <KPICard
 *   label="Revenue"
 *   value={612000}
 *   change={3.2}
 *   trend="up"
 *   format="currency"
 * />
 */
const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  (
    { className, label, value, change, trend, format = "number", unit, sparklineData, ...props },
    ref
  ) => {
    const formattedValue = formatKPIValue(value, format);
    const changeColor = change !== undefined ? getChangeColor(change) : "change-neutral";
    const changeIcon = change !== undefined ? getChangeIcon(change) : "";

    return (
      <Card
        ref={ref}
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "glass-card hover:glow-blue",
          "border-l-4 border-l-primary/30 hover:border-l-primary",
          className
        )}
        {...props}
      >
        <CardContent className="p-6">
          {/* Header with label and trend icon */}
          <div className="flex items-center justify-between mb-3">
            <Typography
              variant="kpi-label"
              className="uppercase tracking-wider"
              data-testid="kpi-label"
            >
              {label}
            </Typography>

            {trend && (
              <div className="flex items-center">
                <TrendIcon trend={trend} />
              </div>
            )}
          </div>

          {/* Main KPI Value */}
          <div className="space-y-2">
            <Typography
              variant="kpi-value"
              className="text-foreground leading-none"
              data-testid="kpi-value"
            >
              {formattedValue}
              {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
            </Typography>

            {/* Change indicator */}
            {change !== undefined && (
              <div className={cn("flex items-center gap-1", changeColor)}>
                <span className="font-semibold" data-testid="kpi-change-icon">
                  {changeIcon}
                </span>
                <Typography variant="kpi-change" className="inherit" data-testid="kpi-change-value">
                  {Math.abs(change).toFixed(1)}% vs last week
                </Typography>
              </div>
            )}
          </div>

          {/* Mini sparkline chart */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-4">
              <MiniSparkline data={sparklineData} />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);
KPICard.displayName = "KPICard";

/**
 * Trend Icon Component - Visual indicator for KPI performance
 */
interface TrendIconProps {
  trend: "up" | "down" | "stable";
  className?: string;
}

const TrendIcon: React.FC<TrendIconProps> = ({ trend, className }) => {
  const icons = {
    up: "📈",
    down: "📉",
    stable: "📊",
  };

  const colors = {
    up: "text-[hsl(var(--positive-growth))]",
    down: "text-[hsl(var(--negative-decline))]",
    stable: "text-[hsl(var(--neutral-stable))]",
  };

  return (
    <span className={cn(colors[trend], className)} data-testid={`trend-icon-${trend}`}>
      {icons[trend]}
    </span>
  );
};

/**
 * Mini Sparkline Component - Compact data visualization
 * Shows trend over time in a compact format
 */
interface MiniSparklineProps {
  data: number[];
  className?: string;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({ data, className }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Generate SVG path for the sparkline
  const pathData = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className={cn("h-8 w-full", className)} data-testid="mini-sparkline">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path
          d={pathData}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/60"
        />
        {/* Gradient fill under the line */}
        <path
          d={`${pathData} L 100 100 L 0 100 Z`}
          fill="currentColor"
          className="text-primary/10"
        />
      </svg>
    </div>
  );
};

export { KPICard, TrendIcon, MiniSparkline };

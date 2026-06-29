import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";

interface KpiDefinition {
  id: number;
  displayName: string;
  displayOrder?: number;
}

interface TrendData {
  year: number;
  weekNumber: number;
  value: string | number;
}

interface TrendsChartProps {
  kpis: KpiDefinition[];
  trends?: TrendData[];
}

export default function TrendsChart({ kpis, trends = [] }: TrendsChartProps) {
  const [timeframe, setTimeframe] = useState("12W");

  // Process real trends data
  const chartData = useMemo(() => {
    const numWeeks = timeframe === "12W" ? 12 : timeframe === "6W" ? 6 : 4;

    if (!trends || trends.length === 0) {
      return [];
    }

    // Group trends by week
    const weeklyData = new Map<string, number[]>();

    trends.forEach((trend) => {
      const weekKey = `${trend.year}-${trend.weekNumber}`;
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, []);
      }
      const value = parseFloat(trend.value?.toString() || "0");
      weeklyData.get(weekKey)!.push(value);
    });

    // Calculate average for each week, sort chronologically, and get last N weeks
    const weeklyAverages = Array.from(weeklyData.entries())
      .map(([weekKey, values]) => {
        const [year, week] = weekKey.split("-").map(Number);
        return {
          weekKey,
          year,
          week,
          average: values.reduce((sum, v) => sum + v, 0) / values.length,
        };
      })
      .sort((a, b) => {
        // Sort by year first, then by week number (ascending)
        if (a.year !== b.year) return a.year - b.year;
        return a.week - b.week;
      })
      .slice(-numWeeks); // Get last N weeks

    // Normalize to percentages (0-100)
    const maxValue = Math.max(...weeklyAverages.map((w) => w.average), 1);
    return weeklyAverages.map((w) => ({
      ...w,
      percentage: (w.average / maxValue) * 100,
    }));
  }, [trends, timeframe]);

  // Generate chart bars from real data
  const generateChartBars = () => {
    if (chartData.length === 0) {
      // Fallback to empty state bars
      const numBars = timeframe === "12W" ? 12 : timeframe === "6W" ? 6 : 4;
      return Array.from({ length: numBars }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-muted/40 rounded-t transition-all"
          style={{ height: "20%" }}
        />
      ));
    }

    return chartData.map((data, i) => {
      const opacity = 0.3 + (i / chartData.length) * 0.7;
      return (
        <div
          key={data.weekKey}
          className="flex-1 bg-primary rounded-t transition-all hover:opacity-80 group relative"
          style={{
            height: `${data.percentage}%`,
            opacity: i === chartData.length - 1 ? 1 : opacity,
          }}
          title={`${data.weekKey}: ${data.average.toFixed(2)}`}
        />
      );
    });
  };

  const timeframeBadges = [
    { label: "12W", value: "12W", active: timeframe === "12W" },
    { label: "6W", value: "6W", active: timeframe === "6W" },
    { label: "4W", value: "4W", active: timeframe === "4W" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle data-testid="text-chart-title">
              {timeframe === "12W" ? "12" : timeframe === "6W" ? "6" : "4"}-Week Trends
            </CardTitle>
            <CardDescription data-testid="text-chart-description">
              Track your KPI performance over time
            </CardDescription>
          </div>
          <div className="flex space-x-1">
            {timeframeBadges.map((badge) => (
              <Badge
                key={badge.value}
                variant={badge.active ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setTimeframe(badge.value)}
                data-testid={`button-timeframe-${badge.value.toLowerCase()}`}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart Area */}
        <div
          className="h-64 bg-muted/30 rounded-lg flex items-end p-4 space-x-2"
          data-testid="container-chart"
        >
          {generateChartBars()}
        </div>

        {/* Chart Labels */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          {chartData.length > 0 ? (
            <>
              <span data-testid="text-chart-start-label">Week {chartData[0]?.week || "—"}</span>
              <span data-testid="text-chart-mid-label">
                Week {chartData[Math.floor(chartData.length / 2)]?.week || "—"}
              </span>
              <span data-testid="text-chart-end-label">
                Week {chartData[chartData.length - 1]?.week || "—"} (Current)
              </span>
            </>
          ) : (
            <>
              <span data-testid="text-chart-start-label">—</span>
              <span data-testid="text-chart-mid-label">—</span>
              <span data-testid="text-chart-end-label">No data</span>
            </>
          )}
        </div>

        {/* Chart Legend */}
        {kpis.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Showing trends for:</p>
            <div className="flex flex-wrap gap-2">
              {kpis.slice(0, 3).map((kpi, index) => (
                <Badge
                  key={kpi.id}
                  variant="outline"
                  className="text-xs"
                  data-testid={`badge-kpi-${index}`}
                >
                  {kpi.displayName}
                </Badge>
              ))}
              {kpis.length > 3 && (
                <Badge variant="outline" className="text-xs" data-testid="badge-kpi-more">
                  +{kpis.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* No Data State */}
        {kpis.length === 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground" data-testid="text-no-data">
              No KPI data available. Add KPIs to see trends.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

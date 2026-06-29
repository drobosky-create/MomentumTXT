import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import TrendsChart from "@/components/trends-chart";
import SmsPreview from "@/components/sms-preview";
import ActivityFeed from "@/components/activity-feed";
import TeamDataEntry from "@/components/team-data-entry";
import AddKpiModal from "@/components/add-kpi-modal";
// New Momentum Design System Components
import { Button, KPICard, PageLayout, ContentSection, Typography } from "@/components/ui";
import { Plus } from "lucide-react";

interface DashboardData {
  kpis: any[];
  snapshots: any[];
  trends: any[];
  activities: any[];
  currentWeek: number;
  currentYear: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showAddKpiModal, setShowAddKpiModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error,
  } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    retry: false,
  });

  // Handle unauthorized errors
  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || isDashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Typography variant="h2" className="mb-2">
            No data available
          </Typography>
          <Typography variant="muted">Please configure your KPIs to get started.</Typography>
        </div>
      </div>
    );
  }

  const {
    kpis = [],
    snapshots = [],
    trends = [],
    activities = [],
    currentWeek = 1,
    currentYear = new Date().getFullYear(),
  } = dashboardData || {};

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <PageLayout
        title="Weekly KPI Dashboard"
        subtitle={`Week ${currentWeek}, ${currentYear} • Last updated 2 hours ago`}
        actions={
          <Button onClick={() => setShowAddKpiModal(true)} data-testid="button-add-kpi-header">
            <Plus className="mr-2 h-4 w-4" />
            Add KPI
          </Button>
        }
      >
        <ContentSection
          title="Key Performance Indicators"
          description="Track your most important business metrics with real-time data and trend analysis"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {kpis.map((kpi: any) => {
              const snapshot = snapshots.find((s: any) => s.kpiDefinitionId === kpi.id);
              const changePercent = snapshot?.changePercent || 0;
              const trend = changePercent > 0 ? "up" : changePercent < 0 ? "down" : "stable";

              return (
                <KPICard
                  key={kpi.id}
                  label={kpi.displayName}
                  value={snapshot?.value || 0}
                  change={changePercent}
                  trend={trend}
                  format={getKPIFormat(kpi.unit)}
                  data-testid={`card-kpi-${kpi.id}`}
                />
              );
            })}

            {/* Add KPI Button - Momentum Design */}
            <div
              className="bg-card rounded-lg border-2 border-dashed border-border p-6 flex items-center justify-center hover:border-primary hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={() => setShowAddKpiModal(true)}
              data-testid="button-add-kpi"
            >
              <div className="text-center">
                <Plus className="h-8 w-8 text-muted-foreground mb-3 mx-auto group-hover:text-primary transition-colors" />
                <Typography
                  variant="small"
                  className="text-muted-foreground group-hover:text-primary"
                >
                  Add KPI
                </Typography>
                <Typography variant="muted" className="mt-1">
                  Configure additional metric
                </Typography>
              </div>
            </div>
          </div>
        </ContentSection>

        <ContentSection title="Performance Analysis">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <TrendsChart kpis={kpis} trends={trends} data-testid="chart-trends" />
            </div>

            <SmsPreview
              kpis={kpis}
              snapshots={snapshots}
              currentWeek={currentWeek}
              data-testid="preview-sms"
            />
          </div>
        </ContentSection>

        <ContentSection title="Team Activity">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityFeed activities={activities} data-testid="feed-activity" />
            <TeamDataEntry currentWeek={currentWeek} data-testid="component-team-data-entry" />
          </div>
        </ContentSection>
      </PageLayout>

      <AddKpiModal
        open={showAddKpiModal}
        onOpenChange={setShowAddKpiModal}
        data-testid="modal-add-kpi"
      />
    </div>
  );
}

// Helper function to determine KPI format based on unit
function getKPIFormat(unit?: string): "currency" | "percentage" | "number" | "rating" {
  if (!unit) return "number";
  if (unit === "$") return "currency";
  if (unit === "%") return "percentage";
  if (unit.includes("⭐")) return "rating";
  return "number";
}

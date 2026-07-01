import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit } from "lucide-react";

interface KpiDefinition {
  id: number;
  displayName: string;
  displayOrder?: number;
  unit?: string;
}

interface KpiSnapshot {
  kpiDefinitionId: number;
  value: string;
  changePercent?: string;
}

interface SmsPreviewProps {
  kpis: KpiDefinition[];
  snapshots: KpiSnapshot[];
  currentWeek: number;
}

export default function SmsPreview({ kpis, snapshots, currentWeek }: SmsPreviewProps) {
  const { toast } = useToast();

  const customizeMutation = useMutation({
    mutationFn: async () => {
      // This would open a customization modal
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "SMS Customization",
        description: "Opening message customization interface...",
      });
    },
  });

  const formatSmsMessage = () => {
    let message = `W${currentWeek} Summary\n`;

    // Get up to 7 KPIs sorted by display order
    const displayKpis = kpis
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .slice(0, 7);

    for (const kpi of displayKpis) {
      const snapshot = snapshots.find((s) => s.kpiDefinitionId === kpi.id);
      if (snapshot) {
        const changePercent = parseFloat(snapshot.changePercent || "0");
        const changeIndicator = changePercent > 0 ? "▲" : changePercent < 0 ? "▼" : "";
        const changeValue = Math.abs(changePercent).toFixed(1);
        const unit = kpi.unit || "";

        let line = `• ${kpi.displayName} ${snapshot.value}${unit}`;
        if (changeIndicator && changeValue !== "0.0") {
          line += ` ${changeIndicator}${changeValue}%`;
        }
        message += line + "\n";
      }
    }

    message += "\nPowered by MomentumTXT";
    return message;
  };

  const smsMessage = formatSmsMessage();
  const characterCount = smsMessage.length;
  const isOverLimit = characterCount > 160;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle data-testid="text-sms-preview-title">SMS Preview</CardTitle>
          <Badge variant={isOverLimit ? "destructive" : "default"} data-testid="badge-sms-status">
            {isOverLimit ? "Over Limit" : "Active"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* SMS Message Preview */}
        <div
          className="bg-muted/50 rounded-lg p-4 font-mono text-sm border"
          data-testid="container-sms-message"
        >
          <div className="whitespace-pre-line text-foreground">{smsMessage}</div>
        </div>

        {/* SMS Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next SMS:</span>
            <span className="font-medium text-foreground" data-testid="text-next-sms-date">
              Fri, 8:00 AM
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Recipients:</span>
            <span className="font-medium text-foreground" data-testid="text-recipient-count">
              3 executives
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Character count:</span>
            <span
              className={`font-medium ${isOverLimit ? "text-destructive" : "text-foreground"}`}
              data-testid="text-character-count"
            >
              {characterCount}/160
            </span>
          </div>
        </div>

        {/* Character Limit Warning */}
        {isOverLimit && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive" data-testid="text-character-warning">
              Message exceeds SMS limit. Consider removing some KPIs or shortening display names.
            </p>
          </div>
        )}

        {/* No Data Warning */}
        {snapshots.length === 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p
              className="text-sm text-yellow-800 dark:text-yellow-400"
              data-testid="text-no-data-warning"
            >
              No KPI data available for this week. Update your KPIs to see the SMS preview.
            </p>
          </div>
        )}

        {/* Customize Button */}
        <Button
          className="w-full"
          onClick={() => customizeMutation.mutate()}
          disabled={customizeMutation.isPending}
          data-testid="button-customize-sms"
        >
          <Edit className="mr-2 h-4 w-4" />
          Customize Message
        </Button>
      </CardContent>
    </Card>
  );
}

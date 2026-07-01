import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Menu, Send, Plus, CheckCircle, Settings } from "lucide-react";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [smsStatus, setSmsStatus] = useState<"idle" | "success" | "error">("idle");

  const testSmsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/sms/test", {
        phoneNumber: "+1234567890", // This would be replaced with actual test number
        message: "This is a test SMS from MomentumTXT dashboard.",
      });
    },
    onSuccess: () => {
      setSmsStatus("success");
      toast({
        title: "Test SMS Sent",
        description: "Test message delivered successfully",
      });
      setTimeout(() => setSmsStatus("idle"), 3000);
    },
    onError: (error: Error) => {
      setSmsStatus("error");
      toast({
        title: "SMS Failed",
        description: error.message,
        variant: "destructive",
      });
      setTimeout(() => setSmsStatus("idle"), 3000);
    },
  });

  const manualDataEntryMutation = useMutation({
    mutationFn: async () => {
      // This would open a modal or navigate to data entry page
      // For now, just show a toast
      return Promise.resolve();
    },
    onSuccess: () => {
      toast({
        title: "Data Entry",
        description: "Opening KPI data entry interface...",
      });
    },
  });

  const handleTestSms = () => {
    testSmsMutation.mutate();
  };

  const handleManualDataEntry = () => {
    manualDataEntryMutation.mutate();
  };

  const handleSetupWizard = () => {
    setLocation("/setup");
  };

  const toggleSidebar = () => {
    // Mobile sidebar toggle - handled by parent component
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={toggleSidebar}
              data-testid="button-toggle-sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* SMS Status Indicator */}
            {smsStatus === "success" && (
              <div className="flex items-center px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm">
                <CheckCircle className="mr-2 h-4 w-4" />
                SMS Sent Successfully
              </div>
            )}

            {/* Actions */}
            <Button variant="outline" onClick={handleSetupWizard} data-testid="button-setup-wizard">
              <Settings className="mr-2 h-4 w-4" />
              Re-run Setup
            </Button>

            <Button
              variant="outline"
              onClick={handleTestSms}
              disabled={testSmsMutation.isPending}
              data-testid="button-test-sms"
            >
              <Send className="mr-2 h-4 w-4" />
              {testSmsMutation.isPending ? "Sending..." : "Send Test SMS"}
            </Button>

            <Button
              onClick={handleManualDataEntry}
              disabled={manualDataEntryMutation.isPending}
              data-testid="button-update-kpis"
            >
              <Plus className="mr-2 h-4 w-4" />
              Update KPIs
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

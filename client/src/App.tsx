import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import Dashboard from "@/pages/dashboard";
import SetupHub from "@/pages/setup-hub";
import SetupWizard from "@/pages/setup-wizard";
import GuidedSetup from "@/pages/guided-setup";
import KpiConfig from "@/pages/kpi-config";
import SmsRecipients from "@/pages/sms-recipients";
import TeamManagement from "@/pages/team-management";
import Billing from "@/pages/billing";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check if user needs setup (no company associated)
  const needsSetup = isAuthenticated && user && !user.companyId;

  // While Clerk (and the app user) resolve, show a loader to avoid flashing Landing.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Unauthenticated users see the landing page, plus the Clerk auth routes.
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/sign-in" component={SignInPage} />
        <Route path="/sign-up" component={SignUpPage} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated users who need setup
  if (needsSetup) {
    return (
      <Switch>
        <Route path="/" component={SetupHub} />
        <Route path="/setup" component={SetupWizard} />
        <Route path="/setup/guided" component={GuidedSetup} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Fully authenticated users with company setup complete
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/setup" component={SetupWizard} />
      <Route path="/setup/guided" component={GuidedSetup} />
      <Route path="/kpis" component={KpiConfig} />
      <Route path="/sms-recipients" component={SmsRecipients} />
      <Route path="/team" component={TeamManagement} />
      <Route path="/billing" component={Billing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

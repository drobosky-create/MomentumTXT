import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Settings, Sparkles, ArrowRight, Zap } from "lucide-react";

export default function SetupHub() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-setup-title">
            Welcome to KPIFlow
          </h1>
          <p
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            data-testid="text-setup-subtitle"
          >
            Let's get your business metrics set up. Choose how you'd like to proceed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            className="group relative overflow-hidden border-2 border-border hover:border-primary/50 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-xl"
            onClick={() => setLocation("/setup/guided")}
            data-testid="card-guided-setup"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  Recommended
                </span>
              </div>

              <h2 className="text-2xl font-semibold text-foreground mb-3">Help me set up</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Chat with our AI assistant. I'll ask a few simple questions about your business and
                automatically configure everything for you.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>5-minute conversational setup</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>AI-powered KPI recommendations</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  <span>Can switch to manual anytime</span>
                </div>
              </div>

              <Button
                className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                variant="outline"
                data-testid="button-guided-setup"
              >
                Start Guided Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card
            className="group relative overflow-hidden border-2 border-border hover:border-muted-foreground/50 transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-xl"
            onClick={() => setLocation("/setup")}
            data-testid="card-manual-setup"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-muted/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-8 relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
                  <Settings className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>

              <h2 className="text-2xl font-semibold text-foreground mb-3">I know what I need</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Go directly to the configuration wizard. Perfect if you already know which KPIs to
                track and how you want things set up.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  <span>Step-by-step form wizard</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                  <span>Full control over all settings</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>AI suggestions still available</span>
                </div>
              </div>

              <Button className="w-full" variant="outline" data-testid="button-manual-setup">
                Start Manual Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Not sure? Start with guided setup — you can always switch to manual mode.
        </p>
      </div>
    </div>
  );
}

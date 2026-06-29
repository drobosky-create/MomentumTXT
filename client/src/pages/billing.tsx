import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  CheckCircle,
  CreditCard,
  Calendar,
  Crown,
  Zap,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

const pricingPlans = [
  {
    id: "starter",
    name: "Starter",
    price: "$39",
    description: "Perfect for small businesses",
    features: ["Up to 3 SMS recipients", "7 KPIs", "Basic integrations", "Email support"],
    maxRecipients: 3,
    maxKpis: 7,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$79",
    description: "For growing companies",
    features: [
      "Up to 10 SMS recipients",
      "Unlimited KPIs",
      "All integrations",
      "Team collaboration",
      "Priority support",
    ],
    popular: true,
    maxRecipients: 10,
    maxKpis: -1, // unlimited
  },
  {
    id: "business",
    name: "Business",
    price: "$149",
    description: "For large organizations",
    features: [
      "Unlimited SMS recipients",
      "Unlimited KPIs",
      "All integrations",
      "Team collaboration",
      "Priority support",
      "Custom reporting",
    ],
    maxRecipients: -1, // unlimited
    maxKpis: -1, // unlimited
  },
];

export default function Billing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("subscription");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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
    data: _subscriptionData,
    isLoading: isSubscriptionLoading,
    error,
  } = useQuery({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  const { data: usage } = useQuery<import("@shared/schema").UsageStats>({
    queryKey: ["/api/usage/stats"],
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

  const createSubscriptionMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await apiRequest("POST", "/api/create-subscription", { planType: planId });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowUpgradeDialog(true);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        toast({
          title: "Subscription Updated",
          description: "Your subscription has been updated successfully",
        });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Subscription Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/billing/portal");
      return await response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to Open Billing Portal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/cancel");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will be cancelled at the end of the current billing period",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTrialDaysRemaining = () => {
    if (!user?.trialEndsAt) return 0;
    const trialEnd = new Date(user.trialEndsAt);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getCurrentPlan = () => {
    // Map subscription status to plan - you may want to add a subscriptionPlan field to user schema later
    const planId = user?.subscriptionStatus === "active" ? "starter" : "starter"; // Default logic, can be enhanced
    return pricingPlans.find((p) => p.id === planId) || pricingPlans[0];
  };

  if (isLoading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const trialDaysRemaining = getTrialDaysRemaining();
  const isOnTrial = user?.subscriptionStatus === "trial";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <Header
          title="Billing & Plans"
          subtitle="Manage your subscription and billing information"
        />

        <div className="p-6 space-y-6">
          {/* Trial Warning */}
          {isOnTrial && trialDaysRemaining <= 3 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800 dark:text-orange-400">
                      Trial Ending Soon
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      Your free trial ends in {trialDaysRemaining} days. Upgrade to continue using
                      KPIFlow.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setShowUpgradeDialog(true)}
                    data-testid="button-upgrade-trial"
                  >
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Subscription Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <p className="text-2xl font-bold" data-testid="text-current-plan">
                      {currentPlan.name}
                    </p>
                  </div>
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <Badge
                  variant={isOnTrial ? "secondary" : "default"}
                  className="mt-2"
                  data-testid="badge-subscription-status"
                >
                  {isOnTrial ? `Trial (${trialDaysRemaining} days left)` : "Active"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Cost</p>
                    <p className="text-2xl font-bold" data-testid="text-monthly-cost">
                      {isOnTrial ? "$0" : currentPlan.price}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Billing</p>
                    <p className="text-2xl font-bold" data-testid="text-next-billing">
                      {isOnTrial
                        ? new Date(
                            Date.now() + trialDaysRemaining * 24 * 60 * 60 * 1000
                          ).toLocaleDateString()
                        : "Monthly"}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="subscription" data-testid="tab-subscription">
                Subscription
              </TabsTrigger>
              <TabsTrigger value="usage" data-testid="tab-usage">
                Usage
              </TabsTrigger>
              <TabsTrigger value="billing" data-testid="tab-billing">
                Billing History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="space-y-6">
              {/* Current Plan Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>Your current plan details and features</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4
                        className="text-lg font-semibold"
                        data-testid="text-subscription-plan-name"
                      >
                        {currentPlan.name} Plan
                      </h4>
                      <p
                        className="text-muted-foreground"
                        data-testid="text-subscription-plan-description"
                      >
                        {currentPlan.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" data-testid="text-subscription-plan-price">
                        {isOnTrial ? "$0" : currentPlan.price}
                      </p>
                      <p className="text-sm text-muted-foreground">per month</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentPlan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm" data-testid={`text-feature-${index}`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex space-x-2 pt-4">
                    {!isOnTrial && currentPlan.id !== "business" && (
                      <Button
                        onClick={() => createSubscriptionMutation.mutate(selectedPlan || "professional")}
                        disabled={createSubscriptionMutation.isPending}
                        data-testid="button-upgrade-plan"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {createSubscriptionMutation.isPending ? "Loading..." : "Upgrade Plan"}
                      </Button>
                    )}
                    {!isOnTrial && (
                      <Button
                        variant="outline"
                        onClick={() => cancelSubscriptionMutation.mutate()}
                        disabled={cancelSubscriptionMutation.isPending}
                        data-testid="button-cancel-subscription"
                      >
                        Cancel Subscription
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => manageBillingMutation.mutate()}
                      disabled={manageBillingMutation.isPending}
                      data-testid="button-manage-billing"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {manageBillingMutation.isPending ? "Opening..." : "Manage Billing"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Available Plans */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Plans</CardTitle>
                  <CardDescription>
                    Compare plans and upgrade or downgrade as needed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {pricingPlans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={`relative ${plan.popular ? "border-primary shadow-lg" : ""} ${currentPlan.id === plan.id ? "bg-muted/30" : ""}`}
                      >
                        {plan.popular && (
                          <Badge
                            className="absolute -top-2 left-1/2 transform -translate-x-1/2"
                            data-testid="badge-popular-plan"
                          >
                            Most Popular
                          </Badge>
                        )}
                        <CardHeader className="text-center">
                          <CardTitle className="text-xl" data-testid={`text-plan-name-${plan.id}`}>
                            {plan.name}
                          </CardTitle>
                          <div
                            className="text-3xl font-bold text-primary"
                            data-testid={`text-plan-price-${plan.id}`}
                          >
                            {plan.price}
                            <span className="text-base font-normal text-muted-foreground">
                              /month
                            </span>
                          </div>
                          <p
                            className="text-muted-foreground"
                            data-testid={`text-plan-description-${plan.id}`}
                          >
                            {plan.description}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2 mb-6">
                            {plan.features.map((feature, featureIndex) => (
                              <li
                                key={featureIndex}
                                className="flex items-center space-x-2"
                                data-testid={`text-plan-feature-${plan.id}-${featureIndex}`}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          {currentPlan.id === plan.id ? (
                            <Badge
                              className="w-full justify-center"
                              data-testid={`badge-current-plan-${plan.id}`}
                            >
                              Current Plan
                            </Badge>
                          ) : (
                            <Button
                              className="w-full"
                              variant={plan.popular ? "default" : "outline"}
                              onClick={() => {
                                setSelectedPlan(plan.id);
                                createSubscriptionMutation.mutate(plan.id);
                              }}
                              disabled={createSubscriptionMutation.isPending}
                              data-testid={`button-select-plan-${plan.id}`}
                            >
                              {currentPlan.id === "starter" && plan.id !== "starter"
                                ? "Upgrade"
                                : currentPlan.id !== "starter" && plan.id === "starter"
                                  ? "Downgrade"
                                  : "Select Plan"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Overview</CardTitle>
                  <CardDescription>Your current usage compared to plan limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* SMS Recipients Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">SMS Recipients</span>
                      <span
                        className="text-sm text-muted-foreground"
                        data-testid="text-recipients-usage"
                      >
                        {usage?.smsRecipients || 0} of{" "}
                        {currentPlan.maxRecipients === -1 ? "∞" : currentPlan.maxRecipients}
                      </span>
                    </div>
                    <Progress
                      value={
                        currentPlan.maxRecipients === -1
                          ? 0
                          : ((usage?.smsRecipients || 0) / currentPlan.maxRecipients) * 100
                      }
                      className="w-full"
                    />
                  </div>

                  {/* KPIs Usage */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Configured KPIs</span>
                      <span className="text-sm text-muted-foreground" data-testid="text-kpis-usage">
                        {usage?.kpisConfigured || 0} of{" "}
                        {currentPlan.maxKpis === -1 ? "∞" : currentPlan.maxKpis}
                      </span>
                    </div>
                    <Progress
                      value={
                        currentPlan.maxKpis === -1
                          ? 0
                          : ((usage?.kpisConfigured || 0) / currentPlan.maxKpis) * 100
                      }
                      className="w-full"
                    />
                  </div>

                  {/* SMS Delivered */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">SMS Delivered This Month</span>
                      <span
                        className="text-sm text-muted-foreground"
                        data-testid="text-sms-delivered-usage"
                      >
                        {usage?.smsDelivered || 0}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, ((usage?.smsDelivered || 0) / 100) * 100)}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billing History</CardTitle>
                  <CardDescription>Your payment history and invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Billing History</h3>
                    <p className="text-muted-foreground mb-4">
                      {isOnTrial
                        ? "You're currently on a free trial. Billing history will appear after your first payment."
                        : "Your billing history will appear here after your first payment."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Upgrade Dialog with Stripe */}
      <Dialog open={showUpgradeDialog} onOpenChange={(open) => {
        setShowUpgradeDialog(open);
        if (!open) setClientSecret(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
            <DialogDescription>
              Enter your payment information to activate your subscription
            </DialogDescription>
          </DialogHeader>
          {clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: "night" } }}
            >
              <SubscriptionForm
                onSuccess={() => {
                  setShowUpgradeDialog(false);
                  setClientSecret(null);
                  queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
                  toast({
                    title: "Subscription Active",
                    description: "Your subscription has been activated successfully!",
                  });
                }}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/billing",
      },
      redirect: "if_required",
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
        data-testid="button-complete-subscription"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            Processing...
          </>
        ) : (
          "Complete Subscription"
        )}
      </Button>
    </form>
  );
}

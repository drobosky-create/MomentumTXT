import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, BarChart3, Smartphone, Users, Zap, TrendingUp } from "lucide-react";

const industries = [
  { code: "54", name: "Professional Services" },
  { code: "44", name: "Retail Trade" },
  { code: "62", name: "Healthcare" },
  { code: "52", name: "Finance & Insurance" },
  { code: "23", name: "Construction" },
  { code: "72", name: "Food Service" },
  { code: "56", name: "Administrative Services" },
  { code: "81", name: "Other Services" },
  { code: "31", name: "Manufacturing" },
  { code: "48", name: "Transportation" },
  { code: "99", name: "Other" },
];

const features = [
  {
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
    title: "AI-Powered KPIs",
    description: "Get industry-specific KPI recommendations tailored to your business",
  },
  {
    icon: <Smartphone className="h-8 w-8 text-primary" />,
    title: "Weekly SMS Reports",
    description: "Executive summaries delivered directly to your phone every Friday",
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Team Collaboration",
    description: "Assign data entry tasks and track completion across your team",
  },
  {
    icon: <Zap className="h-8 w-8 text-primary" />,
    title: "Automated Insights",
    description: "Real-time trend analysis and performance recommendations",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$39",
    description: "Perfect for small businesses",
    features: ["Up to 3 SMS recipients", "7 KPIs", "Basic integrations", "14-day free trial"],
  },
  {
    name: "Professional",
    price: "$79",
    description: "For growing companies",
    features: [
      "Up to 10 SMS recipients",
      "Unlimited KPIs",
      "All integrations",
      "Team collaboration",
      "14-day free trial",
    ],
    popular: true,
  },
  {
    name: "Business",
    price: "$149",
    description: "For large organizations",
    features: [
      "Unlimited SMS recipients",
      "Unlimited KPIs",
      "All integrations",
      "Team collaboration",
      "Priority support",
      "14-day free trial",
    ],
  },
];

export default function Landing() {
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");

  const handleGetStarted = () => {
    // Store form data for setup wizard
    const setupData = {
      companyName,
      selectedIndustry,
      email,
      industry: industries.find((i) => i.code === selectedIndustry)?.name || "",
    };

    // Only store if we have required data
    if (companyName && selectedIndustry) {
      sessionStorage.setItem("setupWizardData", JSON.stringify(setupData));
    }

    // Redirect to login to start the onboarding process
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">KPIFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/api/login")}
                data-testid="button-login"
              >
                Login
              </Button>
              <Button onClick={handleGetStarted} data-testid="button-get-started">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-4" data-testid="badge-beta">
            🚀 Now serving 17.8M+ US businesses
          </Badge>
          <h1
            className="text-4xl md:text-6xl font-bold text-foreground mb-6"
            data-testid="text-hero-title"
          >
            Executive KPIs via SMS
          </h1>
          <p
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            data-testid="text-hero-description"
          >
            Get AI-powered, industry-specific KPI summaries delivered to your phone every Friday. No
            dashboards to check, no emails to miss.
          </p>

          {/* Quick Start Form */}
          <Card className="max-w-md mx-auto text-left">
            <CardHeader>
              <CardTitle>Start Your 14-Day Free Trial</CardTitle>
              <CardDescription>Get personalized KPI recommendations in 2 minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                  data-testid="input-company-name"
                />
              </div>
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger data-testid="select-industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem
                        key={industry.code}
                        value={industry.code}
                        data-testid={`option-industry-${industry.code}`}
                      >
                        {industry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@acme.com"
                  data-testid="input-email"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleGetStarted}
                data-testid="button-start-trial"
              >
                Start Free Trial
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                No credit card required • Setup in under 10 minutes
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2
            className="text-3xl font-bold text-center text-foreground mb-12"
            data-testid="text-features-title"
          >
            Everything you need for executive insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <h3
                    className="text-lg font-semibold mb-2"
                    data-testid={`text-feature-title-${index}`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className="text-muted-foreground text-sm"
                    data-testid={`text-feature-description-${index}`}
                  >
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2
            className="text-3xl font-bold text-center text-foreground mb-4"
            data-testid="text-pricing-title"
          >
            Simple, transparent pricing
          </h2>
          <p className="text-center text-muted-foreground mb-12">
            All plans include a 14-day free trial. No setup fees or hidden costs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
              >
                {plan.popular && (
                  <Badge
                    className="absolute -top-2 left-1/2 transform -translate-x-1/2"
                    data-testid="badge-popular"
                  >
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-xl" data-testid={`text-plan-name-${index}`}>
                    {plan.name}
                  </CardTitle>
                  <div
                    className="text-3xl font-bold text-primary"
                    data-testid={`text-plan-price-${index}`}
                  >
                    {plan.price}
                    <span className="text-base font-normal text-muted-foreground">/month</span>
                  </div>
                  <CardDescription data-testid={`text-plan-description-${index}`}>
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center space-x-2"
                        data-testid={`text-plan-feature-${index}-${featureIndex}`}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={handleGetStarted}
                    data-testid={`button-choose-plan-${index}`}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">
            Ready to transform your business intelligence?
          </h2>
          <p className="text-lg mb-8 opacity-90" data-testid="text-cta-description">
            Join thousands of executives who never miss a KPI update. Get started with your 14-day
            free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={handleGetStarted}
              data-testid="button-cta-primary"
            >
              <TrendingUp className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              data-testid="button-cta-secondary"
            >
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">KPIFlow</span>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-footer-copyright">
            © 2025 KPIFlow. Built for 17.8 million US businesses.
          </p>
        </div>
      </footer>
    </div>
  );
}

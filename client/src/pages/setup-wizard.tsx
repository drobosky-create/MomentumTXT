import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { OnboardingCompanyBasic, IndustryDetails, OnboardingContext } from "@shared/schema";
import { getVisibleFieldsForIndustry } from "@shared/industryConfig";
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  Building2,
  Factory,
  Target,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

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

const setupSteps = [
  {
    id: "company",
    title: "Company Setup",
    description: "Tell us about your business",
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    id: "industry",
    title: "Industry Details",
    description: "Provide business model specifics",
    icon: <Factory className="h-6 w-6" />,
  },
  {
    id: "generate",
    title: "Generate KPIs",
    description: "AI analyzes your business context",
    icon: <Target className="h-6 w-6" />,
  },
  {
    id: "kpis",
    title: "Select KPIs",
    description: "Choose your key metrics",
    icon: <CheckCircle className="h-6 w-6" />,
  },
  {
    id: "recipients",
    title: "SMS Recipients",
    description: "Add who should receive reports",
    icon: <Users className="h-6 w-6" />,
  },
];

interface SetupData {
  companyBasic: OnboardingCompanyBasic;
  industryDetails: IndustryDetails;
  smsRecipients: Array<{
    name: string;
    phoneNumber: string;
  }>;
}

export default function SetupWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { signOut } = useClerk();

  // Check for pre-filled data from landing page or existing user data
  const getPrefilledData = (): SetupData => {
    // First check if user has existing company data
    if (user?.companyId) {
      // For existing users, we'll fetch their current data
      return {
        companyBasic: {
          name: "", // Will be loaded from API
          industry: "",
          naicsCode: "",
          description: "",
        },
        industryDetails: {},
        smsRecipients: [{ name: "", phoneNumber: "" }],
      };
    }

    // For new users, check session storage
    try {
      const saved = sessionStorage.getItem("setupWizardData");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          companyBasic: {
            name: parsed.companyName || "",
            industry: parsed.industry || "",
            naicsCode: parsed.selectedIndustry || "",
            description: "",
          },
          industryDetails: {},
          smsRecipients: [{ name: "", phoneNumber: "" }],
        };
      }
    } catch (error) {
      console.warn("Failed to parse setup wizard data:", error);
    }
    return {
      companyBasic: {
        name: "",
        industry: "",
        naicsCode: "",
        description: "",
      },
      industryDetails: {},
      smsRecipients: [{ name: "", phoneNumber: "" }],
    };
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [setupData, setSetupData] = useState<SetupData>(getPrefilledData);
  const [generatedKpis, setGeneratedKpis] = useState<any[]>([]);
  const [selectedKpis, setSelectedKpis] = useState<any[]>([]);
  const [isExistingUser, setIsExistingUser] = useState(false);

  // Load existing user data if they're re-running setup
  useEffect(() => {
    const loadExistingData = async () => {
      if (user?.companyId) {
        setIsExistingUser(true);
        try {
          // Load existing company data, KPIs, and SMS recipients
          const [companyResponse, kpisResponse, recipientsResponse] = await Promise.all([
            apiRequest("GET", "/api/auth/user"),
            apiRequest("GET", "/api/kpis"),
            apiRequest("GET", "/api/sms-recipients"),
          ]);

          const companyData = await companyResponse.json();
          if (companyData?.company) {
            setSetupData((prev) => ({
              ...prev,
              companyBasic: {
                name: companyData.company.name || "",
                industry: companyData.company.industry || "",
                naicsCode: companyData.company.naicsCode || "",
                description: companyData.company.description || "",
              },
              industryDetails: companyData.company.industryDetails || {},
            }));
          }

          const recipientsData = await recipientsResponse.json();
          if (recipientsData && Array.isArray(recipientsData)) {
            setSetupData((prev) => ({
              ...prev,
              smsRecipients:
                recipientsData.length > 0
                  ? recipientsData.map((r: any) => ({ name: r.name, phoneNumber: r.phoneNumber }))
                  : [{ name: "", phoneNumber: "" }],
            }));
          }

          const kpisData = await kpisResponse.json();
          if (kpisData && Array.isArray(kpisData) && kpisData.length > 0) {
            setSelectedKpis(kpisData);
            // Also set these as generated KPIs so they appear in the selection step
            setGeneratedKpis(kpisData);
          }
        } catch (error) {
          console.warn("Failed to load existing user data:", error);
        }
      }
    };

    loadExistingData();
  }, [user?.companyId]);

  const createCompanyMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      industry: string;
      naicsCode: string;
      industryDetails?: IndustryDetails;
    }) => {
      return await apiRequest("POST", "/api/companies", data);
    },
    onSuccess: () => {
      toast({
        title: "Company Created",
        description: "Your company has been set up successfully!",
      });
      // Don't invalidate user query here - wait until setup is complete
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateKpisMutation = useMutation({
    mutationFn: async (context: OnboardingContext) => {
      return await apiRequest("POST", "/api/kpis/generate", { context });
    },
    onSuccess: (data: any) => {
      setGeneratedKpis(data.kpis || []);
    },
    onError: (error: Error) => {
      toast({
        title: "KPI Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addKpisMutation = useMutation({
    mutationFn: async (kpis: any[]) => {
      const promises = kpis.map((kpi) => apiRequest("POST", "/api/kpis", kpi));
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "KPIs Added",
        description: `${selectedKpis.length} KPIs have been configured successfully!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "KPI Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addRecipientsMutation = useMutation({
    mutationFn: async (recipients: Array<{ name: string; phoneNumber: string }>) => {
      const promises = recipients
        .filter((r) => r.name && r.phoneNumber)
        .map((recipient) => apiRequest("POST", "/api/sms-recipients", recipient));
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Setup Complete!",
        description: "Your KPI dashboard is ready. Redirecting...",
      });
      // Clear stored setup data
      sessionStorage.removeItem("setupWizardData");
      // Invalidate queries to refresh app state
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms-recipients"] });
      // Redirect to dashboard after successful setup
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Recipients Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    if (currentStep === 0) {
      // Validate company info
      if (!setupData.companyBasic.name || !setupData.companyBasic.naicsCode) {
        toast({
          title: "Required Fields",
          description: "Please fill in company name and select an industry",
          variant: "destructive",
        });
        return;
      }

      // Create company
      const industry = industries.find((i) => i.code === setupData.companyBasic.naicsCode);
      await createCompanyMutation.mutateAsync({
        name: setupData.companyBasic.name,
        industry: industry?.name || "",
        naicsCode: setupData.companyBasic.naicsCode,
        industryDetails: setupData.industryDetails,
      });

      setCurrentStep(1);
    } else if (currentStep === 1) {
      // Generate KPIs
      const industry = industries.find((i) => i.code === setupData.companyBasic.naicsCode);
      await generateKpisMutation.mutateAsync({
        companyBasic: {
          name: setupData.companyBasic.name,
          industry: industry?.name || "",
          naicsCode: setupData.companyBasic.naicsCode,
          description: setupData.companyBasic.description,
        },
        industryDetails: setupData.industryDetails,
      });

      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Add selected KPIs
      if (selectedKpis.length === 0) {
        toast({
          title: "Select KPIs",
          description: "Please select at least one KPI to continue",
          variant: "destructive",
        });
        return;
      }

      await addKpisMutation.mutateAsync(selectedKpis);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Add SMS recipients and complete setup
      await addRecipientsMutation.mutateAsync(setupData.smsRecipients);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      // On first step, go back to dashboard or landing page
      sessionStorage.removeItem("setupWizardData");
      if (isExistingUser) {
        window.location.href = "/";
      } else {
        signOut({ redirectUrl: "/" });
      }
    }
  };

  const addSmsRecipient = () => {
    setSetupData({
      ...setupData,
      smsRecipients: [...setupData.smsRecipients, { name: "", phoneNumber: "" }],
    });
  };

  const updateSmsRecipient = (index: number, field: string, value: string) => {
    const updatedRecipients = setupData.smsRecipients.map((recipient, i) =>
      i === index ? { ...recipient, [field]: value } : recipient
    );
    setSetupData({ ...setupData, smsRecipients: updatedRecipients });
  };

  const removeSmsRecipient = (index: number) => {
    const updatedRecipients = setupData.smsRecipients.filter((_, i) => i !== index);
    setSetupData({ ...setupData, smsRecipients: updatedRecipients });
  };

  const toggleKpiSelection = (kpi: any) => {
    if (selectedKpis.find((k) => k.name === kpi.name)) {
      setSelectedKpis(selectedKpis.filter((k) => k.name !== kpi.name));
    } else if (selectedKpis.length < 7) {
      setSelectedKpis([...selectedKpis, kpi]);
    }
  };

  const progressPercentage = ((currentStep + 1) / setupSteps.length) * 100;
  const isLoading =
    createCompanyMutation.isPending ||
    generateKpisMutation.isPending ||
    addKpisMutation.isPending ||
    addRecipientsMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isExistingUser ? "Update Your KPI Setup" : "Welcome to Your KPI Dashboard!"}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isExistingUser
              ? "Review and update your business intelligence configuration"
              : "Let's get your business intelligence system set up in just a few steps"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Step {currentStep + 1} of {setupSteps.length}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="w-full" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {setupSteps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`rounded-full p-2 ${
                    index <= currentStep
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {index < currentStep ? <CheckCircle className="h-4 w-4" /> : step.icon}
                </div>
                <span className="text-xs mt-1 text-center max-w-20 text-gray-600 dark:text-gray-400">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {setupSteps[currentStep].icon}
              {setupSteps[currentStep].title}
            </CardTitle>
            <CardDescription>{setupSteps[currentStep].description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step 0: Company Info */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-name" data-testid="label-company-name">
                    Company Name *
                  </Label>
                  <Input
                    id="company-name"
                    data-testid="input-company-name"
                    placeholder="Enter your company name"
                    value={setupData.companyBasic.name}
                    onChange={(e) =>
                      setSetupData({
                        ...setupData,
                        companyBasic: { ...setupData.companyBasic, name: e.target.value },
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="industry-select" data-testid="label-industry">
                    Industry *
                  </Label>
                  <Select
                    value={setupData.companyBasic.naicsCode}
                    onValueChange={(value) => {
                      const industry = industries.find((i) => i.code === value);
                      setSetupData({
                        ...setupData,
                        companyBasic: {
                          ...setupData.companyBasic,
                          naicsCode: value,
                          industry: industry?.name || "",
                        },
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-industry">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry.code} value={industry.code}>
                          {industry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description" data-testid="label-description">
                    Company Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    data-testid="textarea-description"
                    placeholder="Briefly describe what your company does..."
                    value={setupData.companyBasic.description}
                    onChange={(e) =>
                      setSetupData({
                        ...setupData,
                        companyBasic: { ...setupData.companyBasic, description: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* Step 1: Industry Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Company info summary */}
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <h3 className="font-semibold text-primary mb-2">Company Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Company:</span> {setupData.companyBasic.name}
                    </p>
                    <p>
                      <span className="font-medium">Industry:</span>{" "}
                      {setupData.companyBasic.industry}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="text-lg font-semibold">Tell us more about your business</h3>
                    <p className="text-sm text-muted-foreground">
                      This helps us generate more relevant KPI recommendations.
                    </p>
                  </div>

                  {/* Dynamic Industry Fields */}
                  {getVisibleFieldsForIndustry(setupData.companyBasic.naicsCode).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} data-testid={`label-${field.key}`}>
                        {field.label} {field.required && "*"}
                      </Label>
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground">{field.helpText}</p>
                      )}

                      {field.type === "select" && (
                        <Select
                          value={(setupData.industryDetails[field.key] as string) || ""}
                          onValueChange={(value) => {
                            setSetupData({
                              ...setupData,
                              industryDetails: {
                                ...setupData.industryDetails,
                                [field.key]: value,
                              },
                            });
                          }}
                        >
                          <SelectTrigger data-testid={`select-${field.key}`}>
                            <SelectValue placeholder={field.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === "multiselect" && (
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-lg p-3">
                          {field.options?.map((option) => {
                            const currentValues =
                              (setupData.industryDetails[field.key] as string[]) || [];
                            const isChecked = currentValues.includes(option.value);

                            return (
                              <div key={option.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${field.key}-${option.value}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const currentValues =
                                      (setupData.industryDetails[field.key] as string[]) || [];
                                    const newValues = checked
                                      ? [...currentValues, option.value]
                                      : currentValues.filter((v) => v !== option.value);

                                    setSetupData({
                                      ...setupData,
                                      industryDetails: {
                                        ...setupData.industryDetails,
                                        [field.key]: newValues,
                                      },
                                    });
                                  }}
                                  data-testid={`checkbox-${field.key}-${option.value}`}
                                />
                                <Label
                                  htmlFor={`${field.key}-${option.value}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {option.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {field.type === "number" && (
                        <Input
                          id={field.key}
                          data-testid={`input-${field.key}`}
                          type="number"
                          placeholder={field.placeholder}
                          value={(setupData.industryDetails[field.key] as number) || ""}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            setSetupData({
                              ...setupData,
                              industryDetails: {
                                ...setupData.industryDetails,
                                [field.key]: value,
                              },
                            });
                          }}
                        />
                      )}

                      {field.type === "text" && (
                        <Input
                          id={field.key}
                          data-testid={`input-${field.key}`}
                          placeholder={field.placeholder}
                          value={(setupData.industryDetails[field.key] as string) || ""}
                          onChange={(e) => {
                            setSetupData({
                              ...setupData,
                              industryDetails: {
                                ...setupData.industryDetails,
                                [field.key]: e.target.value,
                              },
                            });
                          }}
                        />
                      )}
                    </div>
                  ))}

                  {getVisibleFieldsForIndustry(setupData.companyBasic.naicsCode).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No additional details needed for this industry.</p>
                      <p className="text-sm">Click "Next" to proceed with KPI generation.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Generate KPIs */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {!generatedKpis.length ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Ready to Generate KPI Recommendations
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Our AI will analyze your business context to suggest relevant KPIs
                    </p>
                    {generateKpisMutation.isPending && (
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mt-4" />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">KPIs Generated Successfully!</h3>
                    <p className="text-muted-foreground">
                      {generatedKpis.length} industry-specific KPIs are ready for your review
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: KPI Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Select Your KPIs</h3>
                  <Badge variant="secondary">{selectedKpis.length}/7 selected</Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  Choose up to 7 key performance indicators that matter most to your business.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {generatedKpis.map((kpi, index) => {
                    const isSelected = selectedKpis.find((k) => k.name === kpi.name);
                    const isDisabled = !isSelected && selectedKpis.length >= 7;

                    return (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : isDisabled
                              ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-50"
                              : "border-gray-200 hover:border-primary hover:bg-primary/5"
                        }`}
                        onClick={() => !isDisabled && toggleKpiSelection(kpi)}
                        data-testid={`kpi-option-${index}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{kpi.name}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {kpi.category}
                            </Badge>
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: SMS Recipients */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">SMS Recipients</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addSmsRecipient}
                    data-testid="button-add-recipient"
                  >
                    Add Recipient
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Add people who should receive weekly SMS reports with your KPI summaries.
                </p>

                <div className="space-y-3">
                  {setupData.smsRecipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label htmlFor={`recipient-name-${index}`}>Name</Label>
                        <Input
                          id={`recipient-name-${index}`}
                          data-testid={`input-recipient-name-${index}`}
                          placeholder="Recipient name"
                          value={recipient.name}
                          onChange={(e) => updateSmsRecipient(index, "name", e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`recipient-phone-${index}`}>Phone</Label>
                        <Input
                          id={`recipient-phone-${index}`}
                          data-testid={`input-recipient-phone-${index}`}
                          placeholder="+1 (555) 123-4567"
                          value={recipient.phoneNumber}
                          onChange={(e) => updateSmsRecipient(index, "phoneNumber", e.target.value)}
                        />
                      </div>
                      {setupData.smsRecipients.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSmsRecipient(index)}
                          data-testid={`button-remove-recipient-${index}`}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevious} data-testid="button-previous">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? (isExistingUser ? "Back to Dashboard" : "Exit Setup") : "Previous"}
          </Button>

          <Button onClick={handleNext} disabled={isLoading} data-testid="button-next">
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : currentStep === setupSteps.length - 1 ? (
              <>
                Complete Setup
                <CheckCircle className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

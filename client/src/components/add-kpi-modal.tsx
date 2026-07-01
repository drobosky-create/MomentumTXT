import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Sparkles, Loader2, TrendingUp, DollarSign, Users, Target } from "lucide-react";

interface AddKpiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
];

const kpiCategories = [
  { id: "financial", name: "Financial", icon: DollarSign, color: "text-green-600" },
  { id: "operational", name: "Operational", icon: TrendingUp, color: "text-blue-600" },
  { id: "customer", name: "Customer", icon: Users, color: "text-purple-600" },
  { id: "marketing", name: "Marketing", icon: Target, color: "text-orange-600" },
  { id: "hr", name: "HR", icon: Users, color: "text-pink-600" },
  { id: "growth", name: "Growth", icon: TrendingUp, color: "text-indigo-600" },
];

interface GeneratedKpi {
  name: string;
  displayName?: string;
  description?: string;
  category: string;
  unit?: string;
  displayFormat?: string;
  priority?: string;
}

interface KpiFormData {
  name: string;
  description?: string;
  category: string;
  unit?: string;
  displayFormat?: string;
  targetValue?: number;
  currentValue?: number;
}

export default function AddKpiModal({ open, onOpenChange }: AddKpiModalProps) {
  const { toast } = useToast();
  useAuth(); // Ensure auth context is available
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("manual");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [generatedKpis, setGeneratedKpis] = useState<GeneratedKpi[]>([]);

  const generateKpisMutation = useMutation({
    mutationFn: async (data: { industry: string; naicsCode: string; companyName: string }) => {
      const response = await apiRequest("POST", "/api/kpis/generate", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setGeneratedKpis(data.kpis || []);
      toast({
        title: "KPIs Generated",
        description: `Generated ${data.kpis?.length || 0} industry-specific KPI suggestions`,
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
          window.location.href = "/sign-in";
        }, 500);
        return;
      }
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addKpiMutation = useMutation({
    mutationFn: async (kpiData: KpiFormData) => {
      const response = await apiRequest("POST", "/api/kpis", kpiData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      onOpenChange(false);
      toast({
        title: "KPI Added",
        description: "KPI has been successfully configured and added to your dashboard",
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
          window.location.href = "/sign-in";
        }, 500);
        return;
      }
      toast({
        title: "Failed to Add KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateKpis = () => {
    if (!selectedIndustry) {
      toast({
        title: "Industry Required",
        description: "Please select your business industry to generate relevant KPIs",
        variant: "destructive",
      });
      return;
    }

    const industry = industries.find((i) => i.code === selectedIndustry);
    generateKpisMutation.mutate({
      industry: industry?.name || "",
      naicsCode: selectedIndustry,
      companyName: "Your Company",
    });
  };

  const handleAddGeneratedKpi = (kpi: GeneratedKpi) => {
    addKpiMutation.mutate(kpi as KpiFormData);
  };

  const getCategoryIcon = (category: string) => {
    const cat = kpiCategories.find((c) => c.id === category);
    if (!cat) return <TrendingUp className="h-4 w-4" />;
    const Icon = cat.icon;
    return <Icon className={`h-4 w-4 ${cat.color}`} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle
            className="flex items-center space-x-2"
            data-testid="text-add-kpi-modal-title"
          >
            <Plus className="h-5 w-5" />
            <span>Add New KPI</span>
          </DialogTitle>
          <DialogDescription>
            Add a new Key Performance Indicator to track in your weekly SMS summaries
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" data-testid="tab-manual-kpi">
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="ai-generate" data-testid="tab-ai-generate">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Custom KPI</CardTitle>
                <CardDescription>
                  Manually define a KPI that's specific to your business needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualKpiForm
                  onSubmit={(data) => addKpiMutation.mutate(data)}
                  isLoading={addKpiMutation.isPending}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-generate" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>AI-Powered KPI Generation</span>
                </CardTitle>
                <CardDescription>
                  Get industry-specific KPI recommendations tailored to your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="industry-select">Your Business Industry</Label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger data-testid="select-industry-generate">
                      <SelectValue placeholder="Choose your business industry for tailored KPIs" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry.code} value={industry.code}>
                          {industry.name} (NAICS {industry.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    This helps our AI suggest the most relevant KPIs for your industry
                  </p>
                </div>

                <Button
                  onClick={handleGenerateKpis}
                  disabled={generateKpisMutation.isPending || !selectedIndustry}
                  className="w-full"
                  data-testid="button-generate-ai-kpis"
                >
                  {generateKpisMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating KPI Suggestions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate KPI Suggestions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated KPIs */}
            {generatedKpis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated KPI Suggestions</CardTitle>
                  <CardDescription>
                    Review and select the KPIs that best fit your business goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedKpis.map((kpi, index) => (
                      <Card
                        key={index}
                        className="border-dashed hover:border-solid transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              {getCategoryIcon(kpi.category)}
                              <h4 className="font-medium" data-testid={`text-ai-kpi-name-${index}`}>
                                {kpi.displayName}
                              </h4>
                            </div>
                            <Badge
                              variant="secondary"
                              data-testid={`badge-ai-kpi-category-${index}`}
                            >
                              {kpi.category}
                            </Badge>
                          </div>

                          <p
                            className="text-sm text-muted-foreground mb-3"
                            data-testid={`text-ai-kpi-description-${index}`}
                          >
                            {kpi.description}
                          </p>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              <span>Priority: {kpi.priority}</span>
                              {kpi.unit && <span>Unit: {kpi.unit}</span>}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAddGeneratedKpi(kpi)}
                              disabled={addKpiMutation.isPending}
                              data-testid={`button-add-ai-kpi-${index}`}
                            >
                              {addKpiMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="mr-1 h-3 w-3" />
                                  Add
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface ManualKpiFormProps {
  onSubmit: (data: KpiFormData) => void;
  isLoading: boolean;
}

function ManualKpiForm({ onSubmit, isLoading }: ManualKpiFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    category: "",
    unit: "",
    iconClass: "fas fa-chart-line",
    colorClass: "text-blue-600",
    dataSource: "manual",
    displayOrder: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-generate name from displayName if not provided
    const kpiData = {
      ...formData,
      name:
        formData.name ||
        formData.displayName.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, ""),
    };

    onSubmit(kpiData);
  };

  const updateIconAndColor = (category: string) => {
    const iconMap: { [key: string]: { icon: string; color: string } } = {
      financial: { icon: "fas fa-dollar-sign", color: "text-green-600" },
      operational: { icon: "fas fa-cogs", color: "text-blue-600" },
      customer: { icon: "fas fa-users", color: "text-purple-600" },
      marketing: { icon: "fas fa-bullhorn", color: "text-orange-600" },
      hr: { icon: "fas fa-user-friends", color: "text-pink-600" },
      growth: { icon: "fas fa-chart-line", color: "text-indigo-600" },
    };

    const config = iconMap[category] || iconMap.financial;
    setFormData((prev) => ({
      ...prev,
      category,
      iconClass: config.icon,
      colorClass: config.color,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="kpi-display-name">KPI Name *</Label>
          <Input
            id="kpi-display-name"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({
                ...formData,
                displayName: e.target.value,
              })
            }
            placeholder="e.g., Monthly Recurring Revenue"
            required
            data-testid="input-manual-kpi-display-name"
          />
          <p className="text-sm text-muted-foreground mt-1">
            This will appear in your SMS reports and dashboard
          </p>
        </div>

        <div>
          <Label htmlFor="kpi-category">Category *</Label>
          <Select value={formData.category} onValueChange={updateIconAndColor}>
            <SelectTrigger data-testid="select-manual-kpi-category">
              <SelectValue placeholder="Select KPI category" />
            </SelectTrigger>
            <SelectContent>
              {kpiCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center space-x-2">
                      <Icon className={`h-4 w-4 ${category.color}`} />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="kpi-description">Description</Label>
        <Textarea
          id="kpi-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this KPI measures and why it's important for your business"
          rows={3}
          data-testid="textarea-manual-kpi-description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="kpi-unit">Unit</Label>
          <Input
            id="kpi-unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="$, %, #, pts, etc."
            data-testid="input-manual-kpi-unit"
          />
          <p className="text-sm text-muted-foreground mt-1">
            How this metric is measured (optional)
          </p>
        </div>

        <div>
          <Label htmlFor="kpi-order">Display Order</Label>
          <Input
            id="kpi-order"
            type="number"
            min="0"
            max="10"
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
            }
            data-testid="input-manual-kpi-order"
          />
          <p className="text-sm text-muted-foreground mt-1">Order in SMS (0 = highest priority)</p>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end space-x-3">
        <Button
          type="submit"
          disabled={isLoading || !formData.displayName || !formData.category}
          data-testid="button-submit-manual-kpi"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding KPI...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add KPI to Dashboard
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

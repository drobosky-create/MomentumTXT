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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Sparkles, Save, AlertTriangle } from "lucide-react";

const industries = [
  { code: "54", name: "Professional Services" },
  { code: "44", name: "Retail Trade" },
  { code: "62", name: "Healthcare" },
  { code: "52", name: "Finance & Insurance" },
  { code: "23", name: "Construction" },
  { code: "72", name: "Food Service" },
  { code: "99", name: "Other" },
];

export default function KpiConfig() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("current");
  const [_showGenerateDialog, _setShowGenerateDialog] = useState(false);
  const [showAddKpiDialog, setShowAddKpiDialog] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [generatedKpis, setGeneratedKpis] = useState<any[]>([]);

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
    data: kpis,
    isLoading: isKpisLoading,
    error,
  } = useQuery({
    queryKey: ["/api/kpis"],
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

  const generateKpisMutation = useMutation({
    mutationFn: async (data: { industry: string; naicsCode: string; companyName: string }) => {
      const response = await apiRequest("POST", "/api/kpis/generate", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setGeneratedKpis(data.kpis || []);
      toast({
        title: "KPIs Generated",
        description: `Generated ${data.kpis?.length || 0} industry-specific KPIs`,
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
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addKpiMutation = useMutation({
    mutationFn: async (kpiData: any) => {
      const response = await apiRequest("POST", "/api/kpis", kpiData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "KPI Added",
        description: "KPI has been successfully configured",
      });
      setShowAddKpiDialog(false);
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
        title: "Failed to Add KPI",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const response = await apiRequest("PUT", `/api/kpis/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "KPI Updated",
        description: "KPI configuration has been saved",
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
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteKpiMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/kpis/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/kpis"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "KPI Removed",
        description: "KPI has been successfully removed",
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
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateKpis = () => {
    if (!selectedIndustry) {
      toast({
        title: "Industry Required",
        description: "Please select an industry to generate KPIs",
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

  const handleAddGeneratedKpi = (kpi: any) => {
    addKpiMutation.mutate(kpi);
  };

  if (isLoading || isKpisLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <Header
          title="Configure KPIs"
          subtitle="Set up and manage your key performance indicators"
        />

        <div className="p-6 space-y-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="current" data-testid="tab-current-kpis">
                Current KPIs
              </TabsTrigger>
              <TabsTrigger value="generate" data-testid="tab-generate-kpis">
                AI Generate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6">
              {/* Current KPIs Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Active KPIs</h3>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(kpis) ? kpis.length : 0} of 7 KPIs configured
                  </p>
                </div>
                <Dialog open={showAddKpiDialog} onOpenChange={setShowAddKpiDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-manual-kpi">
                      <Plus className="mr-2 h-4 w-4" />
                      Add KPI Manually
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom KPI</DialogTitle>
                      <DialogDescription>
                        Create a custom KPI for manual data entry
                      </DialogDescription>
                    </DialogHeader>
                    <ManualKpiForm
                      onSubmit={(data: any) => addKpiMutation.mutate(data)}
                      isLoading={addKpiMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {/* KPIs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(kpis)
                  ? kpis.map((kpi: any) => (
                      <KpiConfigCard
                        key={kpi.id}
                        kpi={kpi}
                        onUpdate={(updates: any) =>
                          updateKpiMutation.mutate({ id: kpi.id, ...updates })
                        }
                        onDelete={() => deleteKpiMutation.mutate(kpi.id)}
                        isUpdating={updateKpiMutation.isPending}
                      />
                    ))
                  : null}
              </div>

              {/* Empty State */}
              {(!Array.isArray(kpis) || kpis.length === 0) && (
                <Card className="text-center py-12">
                  <CardContent>
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No KPIs Configured</h3>
                    <p className="text-muted-foreground mb-4">
                      Get started by generating AI-powered KPI suggestions or adding custom KPIs
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => setSelectedTab("generate")}
                        data-testid="button-goto-generate"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate AI KPIs
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddKpiDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Manually
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="mr-2 h-5 w-5 text-primary" />
                    AI-Powered KPI Generation
                  </CardTitle>
                  <CardDescription>
                    Get industry-specific KPI recommendations tailored to your business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="industry-select">Select Your Industry</Label>
                    <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                      <SelectTrigger data-testid="select-industry">
                        <SelectValue placeholder="Choose your business industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry.code} value={industry.code}>
                            {industry.name} (NAICS {industry.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleGenerateKpis}
                    disabled={generateKpisMutation.isPending || !selectedIndustry}
                    className="w-full"
                    data-testid="button-generate-kpis"
                  >
                    {generateKpisMutation.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Generating KPIs...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate KPIs with AI
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated KPIs */}
              {generatedKpis.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated KPI Suggestions</CardTitle>
                    <CardDescription>
                      Review and add the KPIs that best fit your business needs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generatedKpis.map((kpi, index) => (
                        <Card key={index} className="border-dashed">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4
                                className="font-medium"
                                data-testid={`text-generated-kpi-name-${index}`}
                              >
                                {kpi.displayName}
                              </h4>
                              <Badge
                                variant="secondary"
                                data-testid={`badge-kpi-category-${index}`}
                              >
                                {kpi.category}
                              </Badge>
                            </div>
                            <p
                              className="text-sm text-muted-foreground mb-3"
                              data-testid={`text-generated-kpi-description-${index}`}
                            >
                              {kpi.description}
                            </p>
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-muted-foreground">
                                Priority: {kpi.priority}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleAddGeneratedKpi(kpi)}
                                disabled={addKpiMutation.isPending}
                                data-testid={`button-add-generated-kpi-${index}`}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Add
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
        </div>
      </main>
    </div>
  );
}

function KpiConfigCard({ kpi, onUpdate, onDelete, isUpdating }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: kpi.displayName,
    description: kpi.description || "",
    unit: kpi.unit || "",
    isActive: kpi.isActive,
    displayOrder: kpi.displayOrder || 0,
  });

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          {isEditing ? (
            <Input
              value={editData.displayName}
              onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
              className="font-medium"
              data-testid={`input-edit-kpi-name-${kpi.id}`}
            />
          ) : (
            <h4 className="font-medium" data-testid={`text-kpi-name-${kpi.id}`}>
              {kpi.displayName}
            </h4>
          )}
          <div className="flex items-center space-x-1">
            <Badge
              variant={kpi.isActive ? "default" : "secondary"}
              data-testid={`badge-kpi-status-${kpi.id}`}
            >
              {kpi.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <Label>Description</Label>
              <Textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                placeholder="Describe what this KPI measures"
                data-testid={`textarea-edit-kpi-description-${kpi.id}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Unit</Label>
                <Input
                  value={editData.unit}
                  onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                  placeholder="$, %, #, etc."
                  data-testid={`input-edit-kpi-unit-${kpi.id}`}
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editData.displayOrder}
                  onChange={(e) =>
                    setEditData({ ...editData, displayOrder: parseInt(e.target.value) || 0 })
                  }
                  data-testid={`input-edit-kpi-order-${kpi.id}`}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={editData.isActive}
                onCheckedChange={(checked) => setEditData({ ...editData, isActive: checked })}
                data-testid={`switch-edit-kpi-active-${kpi.id}`}
              />
              <Label>Active in SMS reports</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                data-testid={`button-cancel-edit-${kpi.id}`}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isUpdating}
                data-testid={`button-save-kpi-${kpi.id}`}
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p
              className="text-sm text-muted-foreground mb-3"
              data-testid={`text-kpi-description-${kpi.id}`}
            >
              {kpi.description || "No description provided"}
            </p>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-muted-foreground">
                  Unit: <span className="font-medium">{kpi.unit || "None"}</span>
                </span>
                <span className="text-muted-foreground">
                  Source: <span className="font-medium">{kpi.dataSource}</span>
                </span>
              </div>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid={`button-edit-kpi-${kpi.id}`}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete()}
                  data-testid={`button-delete-kpi-${kpi.id}`}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ManualKpiForm({ onSubmit, isLoading }: any) {
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
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="kpi-name">KPI Name</Label>
          <Input
            id="kpi-name"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({
                ...formData,
                displayName: e.target.value,
                name: e.target.value.toLowerCase().replace(/\s+/g, "_"),
              })
            }
            placeholder="Revenue Growth"
            required
            data-testid="input-manual-kpi-name"
          />
        </div>
        <div>
          <Label htmlFor="kpi-category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger data-testid="select-manual-kpi-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="hr">HR</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
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
          placeholder="Describe what this KPI measures and why it's important"
          data-testid="textarea-manual-kpi-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="kpi-unit">Unit</Label>
          <Input
            id="kpi-unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="$, %, #, etc."
            data-testid="input-manual-kpi-unit"
          />
        </div>
        <div>
          <Label htmlFor="kpi-order">Display Order</Label>
          <Input
            id="kpi-order"
            type="number"
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
            }
            data-testid="input-manual-kpi-order"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !formData.displayName}
          data-testid="button-submit-manual-kpi"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Add KPI
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

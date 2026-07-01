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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Phone, Send, UserCheck, AlertTriangle, MessageCircle, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SmsRecipient, SmsDeliveryLog, InsertSmsRecipient } from "@shared/schema";

export default function SmsRecipients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<SmsRecipient | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const {
    data: recipients = [],
    isLoading: isRecipientsLoading,
    error,
  } = useQuery<SmsRecipient[]>({
    queryKey: ["/api/sms-recipients"],
    retry: false,
  });

  const { data: smsHistory = [] } = useQuery<SmsDeliveryLog[]>({
    queryKey: ["/api/sms-delivery-history"],
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
        window.location.href = "/sign-in";
      }, 500);
    }
  }, [error, toast]);

  const addRecipientMutation = useMutation({
    mutationFn: async (data: { name: string; phoneNumber: string }) => {
      const response = await apiRequest("POST", "/api/sms-recipients", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-recipients"] });
      setShowAddDialog(false);
      toast({
        title: "Recipient Added",
        description: "SMS recipient has been successfully added",
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
        title: "Failed to Add Recipient",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRecipientMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const response = await apiRequest("PUT", `/api/sms-recipients/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-recipients"] });
      setEditingRecipient(null);
      toast({
        title: "Recipient Updated",
        description: "SMS recipient has been successfully updated",
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
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sms-recipients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms-recipients"] });
      toast({
        title: "Recipient Removed",
        description: "SMS recipient has been successfully removed",
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
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testSmsMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("POST", "/api/sms/test", {
        phoneNumber,
        message:
          "This is a test message from MomentumTXT. Your SMS notifications are configured correctly!",
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test SMS Sent",
        description: "Test message delivered successfully",
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
        title: "SMS Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPhoneNumber = (phone: string) => {
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (isLoading || isRecipientsLoading) {
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
        <Header title="SMS Recipients" subtitle="Manage who receives your weekly KPI summaries" />

        <div className="p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Recipients</p>
                    <p className="text-2xl font-bold" data-testid="text-active-recipients-count">
                      {recipients?.filter((r: any) => r.isActive).length || 0}
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">SMS Sent This Week</p>
                    <p className="text-2xl font-bold" data-testid="text-sms-sent-count">
                      {smsHistory?.filter((s: any) => s.status === "sent").length || 0}
                    </p>
                  </div>
                  <Send className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                    <p className="text-2xl font-bold" data-testid="text-delivery-rate">
                      {smsHistory?.length > 0
                        ? `${Math.round((smsHistory.filter((s: any) => s.status === "sent").length / smsHistory.length) * 100)}%`
                        : "100%"}
                    </p>
                  </div>
                  <Phone className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sendblue Activation Notice */}
          <Card className="border-blue-500/40 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-300 mb-1">Recipient Activation Required</p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Before a recipient can receive weekly KPI reports, they need to send one text to activate their number. Have them text <span className="font-medium text-foreground">any message</span> to:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-bold text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-md">
                      +1 (305) 450-7715
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText("+13054507715");
                        toast({ title: "Copied!", description: "Phone number copied to clipboard" });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    They only need to do this once. This is a shared number used during the free plan — upgrading to a dedicated line removes this requirement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipients Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SMS Recipients</CardTitle>
                  <CardDescription>
                    Manage the list of people who will receive weekly KPI summaries
                  </CardDescription>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-recipient">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Recipient
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add SMS Recipient</DialogTitle>
                      <DialogDescription>
                        Add a new person to receive weekly KPI SMS updates
                      </DialogDescription>
                    </DialogHeader>
                    <RecipientForm
                      onSubmit={(data: Pick<InsertSmsRecipient, "name" | "phoneNumber">) =>
                        addRecipientMutation.mutate(data)
                      }
                      isLoading={addRecipientMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {recipients && recipients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((recipient: any) => (
                      <TableRow key={recipient.id}>
                        <TableCell
                          className="font-medium"
                          data-testid={`text-recipient-name-${recipient.id}`}
                        >
                          {recipient.name}
                        </TableCell>
                        <TableCell data-testid={`text-recipient-phone-${recipient.id}`}>
                          {formatPhoneNumber(recipient.phoneNumber)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={recipient.isActive ? "default" : "secondary"}
                            data-testid={`badge-recipient-status-${recipient.id}`}
                          >
                            {recipient.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-recipient-date-${recipient.id}`}>
                          {new Date(recipient.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex justify-end space-x-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => testSmsMutation.mutate(recipient.phoneNumber)}
                                    disabled={testSmsMutation.isPending}
                                    data-testid={`button-test-sms-${recipient.id}`}
                                  >
                                    <Send className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send test SMS</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRecipient(recipient)}
                                    data-testid={`button-edit-recipient-${recipient.id}`}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit recipient</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                                    disabled={deleteRecipientMutation.isPending}
                                    data-testid={`button-delete-recipient-${recipient.id}`}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove recipient</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Recipients Configured</h3>
                  <p className="text-muted-foreground mb-4">
                    Add SMS recipients to start receiving weekly KPI summaries
                  </p>
                  <Button
                    onClick={() => setShowAddDialog(true)}
                    data-testid="button-add-first-recipient"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Recipient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Edit Recipient Dialog */}
      <Dialog open={!!editingRecipient} onOpenChange={() => setEditingRecipient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SMS Recipient</DialogTitle>
            <DialogDescription>Update recipient information and settings</DialogDescription>
          </DialogHeader>
          {editingRecipient && (
            <RecipientForm
              initialData={editingRecipient}
              onSubmit={(data: Pick<InsertSmsRecipient, "name" | "phoneNumber">) =>
                updateRecipientMutation.mutate({ id: editingRecipient.id, ...data })
              }
              isLoading={updateRecipientMutation.isPending}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface RecipientFormProps {
  initialData?: SmsRecipient;
  onSubmit: (data: Pick<InsertSmsRecipient, "name" | "phoneNumber">) => void;
  isLoading: boolean;
  isEditing?: boolean;
}

function RecipientForm({
  initialData,
  onSubmit,
  isLoading,
  isEditing = false,
}: RecipientFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phoneNumber: initialData?.phoneNumber || "",
    isActive: initialData?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="recipient-name">Name</Label>
        <Input
          id="recipient-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          required
          data-testid="input-recipient-name"
        />
      </div>

      <div>
        <Label htmlFor="recipient-phone">Phone Number</Label>
        <Input
          id="recipient-phone"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          placeholder="+1234567890"
          required
          data-testid="input-recipient-phone"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Include country code (e.g., +1 for US numbers)
        </p>
      </div>

      {!isEditing && (
        <div className="rounded-md bg-blue-500/10 border border-blue-500/30 p-3 text-sm">
          <p className="font-medium text-blue-300 mb-1">Before adding, activate this recipient</p>
          <p className="text-muted-foreground">
            Ask them to send any text to <span className="font-mono font-bold text-foreground">+1 (305) 450-7715</span> first. They only need to do this once.
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !formData.name || !formData.phoneNumber}
          data-testid="button-submit-recipient"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              {isEditing ? "Updating..." : "Adding..."}
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {isEditing ? "Update Recipient" : "Add Recipient"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

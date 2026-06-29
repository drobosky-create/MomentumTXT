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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  Calendar,
} from "lucide-react";
import type { TeamAssignment as BaseTeamAssignment, KpiDefinition } from "@shared/schema";

// Extended TeamAssignment with joined user and KPI data from API
interface TeamAssignment extends BaseTeamAssignment {
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImageUrl?: string;
  };
  kpiDefinition?: {
    id: number;
    displayName: string;
    name: string;
  };
}

export default function TeamManagement() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("assignments");
  const [showAssignDialog, setShowAssignDialog] = useState(false);

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
    data: teamAssignments = [],
    isLoading: isAssignmentsLoading,
    error,
  } = useQuery<TeamAssignment[]>({
    queryKey: ["/api/team-assignments"],
    retry: false,
  });

  const { data: kpis = [] } = useQuery<KpiDefinition[]>({
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

  const assignTaskMutation = useMutation({
    mutationFn: async (data: CreateTeamAssignmentRequest) => {
      const response = await apiRequest("POST", "/api/team-assignments", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-assignments"] });
      setShowAssignDialog(false);
      toast({
        title: "Task Assigned",
        description: "KPI data entry task has been assigned successfully",
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
        title: "Assignment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: number;
      status?: string;
      completedAt?: string;
    }) => {
      const response = await apiRequest("PUT", `/api/team-assignments/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-assignments"] });
      toast({
        title: "Assignment Updated",
        description: "Task status has been updated",
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

  const sendReminderMutation = useMutation({
    mutationFn: async (assignmentIds: number[]) => {
      const response = await apiRequest("POST", "/api/team-assignments/remind", { assignmentIds });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminders Sent",
        description: "Email reminders have been sent to team members",
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
        title: "Reminder Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getCurrentWeek = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "overdue":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading || isAssignmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  const pendingAssignments = teamAssignments?.filter((a: TeamAssignment) => a.status === "pending") || [];
  const completedAssignments = teamAssignments?.filter((a: TeamAssignment) => a.status === "completed") || [];
  const _overdueAssignments = teamAssignments?.filter((a: TeamAssignment) => a.status === "overdue") || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <Header
          title="Team Management"
          subtitle="Assign and track KPI data entry tasks across your team"
        />

        <div className="p-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="text-2xl font-bold" data-testid="text-team-members-count">
                      {new Set(teamAssignments?.map((a: any) => a.userId)).size || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Tasks</p>
                    <p className="text-2xl font-bold" data-testid="text-pending-tasks-count">
                      {pendingAssignments.length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold" data-testid="text-completed-tasks-count">
                      {completedAssignments.length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold" data-testid="text-completion-rate">
                      {teamAssignments?.length > 0
                        ? `${Math.round((completedAssignments.length / teamAssignments.length) * 100)}%`
                        : "0%"}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="assignments" data-testid="tab-assignments">
                  Current Assignments
                </TabsTrigger>
                <TabsTrigger value="members" data-testid="tab-members">
                  Team Members
                </TabsTrigger>
              </TabsList>

              <div className="flex space-x-2">
                {pendingAssignments.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      sendReminderMutation.mutate(pendingAssignments.map((a: any) => a.id))
                    }
                    disabled={sendReminderMutation.isPending}
                    data-testid="button-send-reminders"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                )}

                <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-assign-task">
                      <Plus className="mr-2 h-4 w-4" />
                      Assign Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign KPI Data Entry</DialogTitle>
                      <DialogDescription>
                        Assign a KPI data entry task to a team member
                      </DialogDescription>
                    </DialogHeader>
                    <AssignmentForm
                      kpis={kpis || []}
                      onSubmit={(data: CreateTeamAssignmentRequest) =>
                        assignTaskMutation.mutate(data)
                      }
                      isLoading={assignTaskMutation.isPending}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <TabsContent value="assignments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Week Assignments</CardTitle>
                  <CardDescription>
                    Week {getCurrentWeek()} data entry tasks and their status
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {teamAssignments && teamAssignments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Team Member</TableHead>
                          <TableHead>KPI</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamAssignments.map((assignment: any) => (
                          <TableRow key={assignment.id}>
                            <TableCell
                              className="font-medium"
                              data-testid={`text-assignment-user-${assignment.id}`}
                            >
                              {assignment.user?.firstName ||
                                assignment.user?.email ||
                                "Unknown User"}
                            </TableCell>
                            <TableCell data-testid={`text-assignment-kpi-${assignment.id}`}>
                              {assignment.kpiDefinition?.displayName || "Unknown KPI"}
                            </TableCell>
                            <TableCell data-testid={`text-assignment-due-${assignment.id}`}>
                              {assignment.dueDate
                                ? new Date(assignment.dueDate).toLocaleDateString()
                                : "No due date"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusColor(assignment.status)}
                                className="flex items-center space-x-1"
                                data-testid={`badge-assignment-status-${assignment.id}`}
                              >
                                {getStatusIcon(assignment.status)}
                                <span className="capitalize">{assignment.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-assignment-created-${assignment.id}`}>
                              {new Date(assignment.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {assignment.status === "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateAssignmentMutation.mutate({
                                      id: assignment.id,
                                      status: "completed",
                                      completedAt: new Date().toISOString(),
                                    })
                                  }
                                  disabled={updateAssignmentMutation.isPending}
                                  data-testid={`button-mark-complete-${assignment.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create task assignments to distribute KPI data entry across your team
                      </p>
                      <Button
                        onClick={() => setShowAssignDialog(true)}
                        data-testid="button-create-first-assignment"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Assignment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage team member roles and responsibilities</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Team Member Management</h3>
                    <p className="text-muted-foreground mb-4">
                      This feature allows you to invite and manage team members. Currently showing
                      assignments for existing users.
                    </p>
                    <Button variant="outline" data-testid="button-invite-members">
                      <Plus className="mr-2 h-4 w-4" />
                      Invite Team Members
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

// API request type - matches what the backend expects
interface CreateTeamAssignmentRequest {
  userId: string;
  kpiDefinitionId: number;
  weekNumber: number;
  year: number;
  dueDate?: string;
}

interface AssignmentFormProps {
  kpis: KpiDefinition[];
  onSubmit: (data: CreateTeamAssignmentRequest) => void;
  isLoading: boolean;
}

function AssignmentForm({ kpis, onSubmit, isLoading }: AssignmentFormProps) {
  const getCurrentWeekNumber = () => {
    const now = new Date();
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const [formData, setFormData] = useState({
    kpiDefinitionId: "",
    userId: "",
    weekNumber: getCurrentWeekNumber(),
    year: new Date().getFullYear(),
    dueDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      userId: formData.userId,
      kpiDefinitionId: parseInt(formData.kpiDefinitionId),
      weekNumber: formData.weekNumber,
      year: formData.year,
      dueDate: formData.dueDate,
    });
  };

  // Set default due date to next Friday
  useEffect(() => {
    const getNextFriday = () => {
      const today = new Date();
      const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + daysUntilFriday);
      return nextFriday.toISOString().split("T")[0];
    };

    setFormData((prev) => ({ ...prev, dueDate: getNextFriday() }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="kpi-select">KPI</Label>
        <Select
          value={formData.kpiDefinitionId}
          onValueChange={(value) => setFormData({ ...formData, kpiDefinitionId: value })}
        >
          <SelectTrigger data-testid="select-assignment-kpi">
            <SelectValue placeholder="Select a KPI to assign" />
          </SelectTrigger>
          <SelectContent>
            {kpis.map((kpi: any) => (
              <SelectItem key={kpi.id} value={kpi.id.toString()}>
                {kpi.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="user-id">Team Member ID</Label>
        <Input
          id="user-id"
          type="text"
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
          placeholder="Enter user ID"
          required
          data-testid="input-assignment-user-id"
        />
        <p className="text-sm text-muted-foreground mt-1">
          User ID of the team member who will enter this KPI data
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="due-date">Due Date</Label>
          <Input
            id="due-date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
            data-testid="input-assignment-due-date"
          />
        </div>
        <div>
          <Label htmlFor="week-number">Week Number</Label>
          <Input
            id="week-number"
            type="number"
            min="1"
            max="53"
            value={formData.weekNumber}
            onChange={(e) =>
              setFormData({ ...formData, weekNumber: parseInt(e.target.value) || 1 })
            }
            data-testid="input-assignment-week-number"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !formData.kpiDefinitionId || !formData.userId}
          data-testid="button-submit-assignment"
        >
          {isLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
              Assigning...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Assign Task
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

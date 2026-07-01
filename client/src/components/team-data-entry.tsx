import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, CheckCircle, Clock, AlertTriangle, User } from "lucide-react";
import type { TeamAssignment as BaseTeamAssignment, KpiDefinition } from "@shared/schema";

interface TeamDataEntryProps {
  currentWeek: number;
}

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

export default function TeamDataEntry({ currentWeek }: TeamDataEntryProps) {
  const { toast } = useToast();
  useAuth(); // Ensure auth context is available
  const queryClient = useQueryClient();
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  const { data: teamAssignments = [], isLoading } = useQuery<TeamAssignment[]>({
    queryKey: ["/api/team-assignments"],
    retry: false,
  });

  const { data: kpis = [] } = useQuery<KpiDefinition[]>({
    queryKey: ["/api/kpis"],
    retry: false,
  });

  const assignTaskMutation = useMutation({
    mutationFn: async (data: {
      kpiDefinitionId: number;
      userId: string;
      weekNumber: number;
      year: number;
      dueDate?: string;
    }) => {
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
          window.location.href = "/sign-in";
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

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const pendingIds =
        teamAssignments
          ?.filter((a: TeamAssignment) => a.status === "pending")
          .map((a: TeamAssignment) => a.id) || [];

      const response = await apiRequest("POST", "/api/team-assignments/remind", {
        assignmentIds: pendingIds,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminders Sent",
        description: "Email reminders have been sent to team members with pending tasks",
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
        title: "Reminder Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getUserInitials = (user: TeamAssignment["user"]) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user: TeamAssignment["user"]) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Unknown User";
  };

  const pendingAssignments =
    teamAssignments?.filter((a: TeamAssignment) => a.status === "pending") || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle data-testid="text-team-data-entry-title">Team Data Entry</CardTitle>
            <CardDescription>KPI assignments and task completion status</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignDialog(true)}
            data-testid="button-assign-tasks"
          >
            <Plus className="mr-2 h-4 w-4" />
            Assign Task
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {teamAssignments && teamAssignments.length > 0 ? (
          <>
            {teamAssignments.slice(0, 4).map((assignment: TeamAssignment, index: number) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                data-testid={`team-assignment-${index}`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    {assignment.user?.profileImageUrl ? (
                      <AvatarImage src={assignment.user.profileImageUrl} alt="Profile" />
                    ) : (
                      <AvatarFallback className="text-xs">
                        {getUserInitials(assignment.user)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p
                      className="text-sm font-medium text-foreground"
                      data-testid={`assignment-user-name-${index}`}
                    >
                      {getUserDisplayName(assignment.user)}
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      data-testid={`assignment-kpi-name-${index}`}
                    >
                      {assignment.kpiDefinition?.displayName || "Unknown KPI"} • Due{" "}
                      {assignment.dueDate
                        ? new Date(assignment.dueDate).toLocaleDateString()
                        : "TBD"}
                    </p>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className={`flex items-center space-x-1 ${getStatusColor(assignment.status || "pending")}`}
                  data-testid={`assignment-status-${index}`}
                >
                  {getStatusIcon(assignment.status || "pending")}
                  <span className="capitalize">{assignment.status || "pending"}</span>
                </Badge>
              </div>
            ))}

            {pendingAssignments.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => sendReminderMutation.mutate()}
                disabled={sendReminderMutation.isPending}
                data-testid="button-send-reminders"
              >
                <Mail className="mr-2 h-4 w-4" />
                {sendReminderMutation.isPending ? "Sending..." : "Send Reminders"}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-assignments">
              No team assignments for this week
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Assign KPI data entry tasks to team members
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowAssignDialog(true)}
              data-testid="button-create-first-assignment"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </div>
        )}
      </CardContent>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign KPI Data Entry</DialogTitle>
            <DialogDescription>
              Assign a team member to enter data for a specific KPI this week
            </DialogDescription>
          </DialogHeader>
          <AssignmentForm
            kpis={kpis || []}
            currentWeek={currentWeek}
            onSubmit={(data) => assignTaskMutation.mutate(data)}
            isLoading={assignTaskMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}

interface CreateTeamAssignmentRequest {
  kpiDefinitionId: number;
  userId: string;
  weekNumber: number;
  year: number;
  dueDate?: string;
}

interface AssignmentFormProps {
  kpis: KpiDefinition[];
  currentWeek: number;
  onSubmit: (data: CreateTeamAssignmentRequest) => void;
  isLoading: boolean;
}

function AssignmentForm({ kpis, currentWeek, onSubmit, isLoading }: AssignmentFormProps) {
  const [formData, setFormData] = useState({
    kpiDefinitionId: "",
    userId: "",
    weekNumber: currentWeek,
    year: new Date().getFullYear(),
    dueDate: "",
  });

  // Set default due date to next Friday
  useState(() => {
    const getNextFriday = () => {
      const today = new Date();
      const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + daysUntilFriday);
      return nextFriday.toISOString().split("T")[0];
    };

    setFormData((prev) => ({ ...prev, dueDate: getNextFriday() }));
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      kpiDefinitionId: parseInt(formData.kpiDefinitionId),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="kpi-select">KPI to Assign</Label>
        <Select
          value={formData.kpiDefinitionId}
          onValueChange={(value) => setFormData({ ...formData, kpiDefinitionId: value })}
        >
          <SelectTrigger data-testid="select-assignment-kpi">
            <SelectValue placeholder="Select a KPI for data entry" />
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
          data-testid="input-team-member-id"
        />
        <p className="text-sm text-muted-foreground mt-1">
          User ID of the team member responsible for this KPI
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
              setFormData({ ...formData, weekNumber: parseInt(e.target.value) || currentWeek })
            }
            data-testid="input-assignment-week"
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

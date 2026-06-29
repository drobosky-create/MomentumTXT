import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Edit, FolderSync, UserPlus, Send, AlertTriangle } from "lucide-react";

interface ActivityMetadata {
  smsCount?: number;
  kpiName?: string;
  [key: string]: unknown;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  createdAt: string;
  metadata?: ActivityMetadata;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "sms_sent":
      case "weekly_sms_sent":
      case "weekly_sms_automated":
        return <Send className="h-4 w-4 text-green-600" />;
      case "kpi_data_entered":
      case "kpi_updated":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "data_sync":
      case "sync_completed":
        return <FolderSync className="h-4 w-4 text-purple-600" />;
      case "user_added":
      case "sms_recipient_added":
        return <UserPlus className="h-4 w-4 text-orange-600" />;
      case "kpi_created":
      case "company_created":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "sms_sent":
      case "weekly_sms_sent":
      case "weekly_sms_automated":
        return "bg-green-100 dark:bg-green-900/20";
      case "kpi_data_entered":
      case "kpi_updated":
        return "bg-blue-100 dark:bg-blue-900/20";
      case "data_sync":
      case "sync_completed":
        return "bg-purple-100 dark:bg-purple-900/20";
      case "user_added":
      case "sms_recipient_added":
        return "bg-orange-100 dark:bg-orange-900/20";
      case "kpi_created":
      case "company_created":
        return "bg-green-100 dark:bg-green-900/20";
      default:
        return "bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      if (days === 1) return "Yesterday";
      if (days <= 7) return `${days} days ago`;
      return date.toLocaleDateString();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle data-testid="text-activity-feed-title">Recent Activity</CardTitle>
            <CardDescription>Latest system and user activities</CardDescription>
          </div>
          <Badge variant="secondary" data-testid="badge-activity-count">
            {activities.length} activities
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3"
                data-testid={`activity-item-${index}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm text-foreground"
                    data-testid={`activity-description-${index}`}
                  >
                    {activity.description}
                  </p>
                  <p
                    className="text-xs text-muted-foreground"
                    data-testid={`activity-time-${index}`}
                  >
                    {formatTimeAgo(activity.createdAt)}
                  </p>
                  {activity.metadata && (
                    <div className="mt-1">
                      {activity.metadata.smsCount && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          data-testid={`activity-metadata-${index}`}
                        >
                          {activity.metadata.smsCount} SMS sent
                        </Badge>
                      )}
                      {activity.metadata.kpiName && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          data-testid={`activity-kpi-${index}`}
                        >
                          {activity.metadata.kpiName}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-activities">
              No recent activity found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Activities will appear here as you use the system
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

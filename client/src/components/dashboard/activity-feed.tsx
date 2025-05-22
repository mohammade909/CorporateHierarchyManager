import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserPlus, 
  Video, 
  MessageSquare, 
  FileEdit,
  CalendarPlus,
  Mail
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: number;
  type: string;
  actor: string;
  subject?: string;
  timestamp: string;
  targetGroup?: string;
  messageType?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_added":
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
        );
      case "meeting_scheduled":
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <CalendarPlus className="h-5 w-5 text-success" />
          </div>
        );
      case "message_sent":
        return (
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            {activities.messageType === "voice" ? (
              <MessageSquare className="h-5 w-5 text-indigo-600" />
            ) : (
              <Mail className="h-5 w-5 text-indigo-600" />
            )}
          </div>
        );
      case "profile_updated":
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <FileEdit className="h-5 w-5 text-yellow-600" />
          </div>
        );
      case "meeting_joined":
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <Video className="h-5 w-5 text-success" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <FileEdit className="h-5 w-5 text-gray-600" />
          </div>
        );
    }
  };

  // Format activity text based on type
  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case "user_added":
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.actor}</span> added new employee{" "}
            <span className="font-medium">{activity.subject}</span>
          </p>
        );
      case "meeting_scheduled":
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.actor}</span> scheduled a team meeting
          </p>
        );
      case "message_sent":
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.actor}</span> sent a{" "}
            {activity.messageType === "voice" ? "voice" : "text"} message to{" "}
            {activity.targetGroup || "the team"}
          </p>
        );
      case "profile_updated":
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.actor}</span> updated company profile
          </p>
        );
      case "meeting_joined":
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.actor}</span> joined a video meeting
          </p>
        );
      default:
        return (
          <p className="text-sm">
            <span className="font-medium">{activity.actor}</span> performed an action
          </p>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="p-5 border-b border-gray-200 flex justify-between items-center">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="link" className="text-primary text-sm p-0">View All</Button>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex">
                {getActivityIcon(activity.type)}
                <div className="ml-3">
                  {getActivityText(activity)}
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Video, Users } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface UpcomingMeetingsProps {
  meetings: any[];
}

export default function UpcomingMeetings({ meetings }: UpcomingMeetingsProps) {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  // Query to get users for participant info
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Filter meetings to show only upcoming ones
  const now = new Date();
  const upcomingMeetings = meetings
    .filter((meeting) => new Date(meeting.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 2); // Show only the next 2 meetings

  // Format dates
  const formatMeetingTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // If same day
    if (start.toDateString() === end.toDateString()) {
      return `${format(start, "MMM d, yyyy, h:mm a")} - ${format(end, "h:mm a")}`;
    }
    
    // Different days
    return `${format(start, "MMM d, yyyy, h:mm a")} - ${format(end, "MMM d, yyyy, h:mm a")}`;
  };

  // Check if a meeting is happening now
  const isMeetingNow = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();
    
    return start <= now && now <= end;
  };

  return (
    <Card>
      <CardHeader className="p-5 border-b border-gray-200 flex justify-between items-center">
        <CardTitle>Upcoming Meetings</CardTitle>
        <Button variant="link" className="text-primary text-sm p-0" onClick={() => navigate("/meetings")}>
          Schedule New
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {upcomingMeetings.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No upcoming meetings</p>
          ) : (
            upcomingMeetings.map((meeting) => {
              const isNow = isMeetingNow(meeting.startTime, meeting.endTime);
              
              return (
                <div 
                  key={meeting.id} 
                  className="p-4 rounded-lg border border-gray-200 hover:shadow transition cursor-pointer"
                  onClick={() => navigate(`/meetings?id=${meeting.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{meeting.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatMeetingTime(meeting.startTime, meeting.endTime)}
                      </p>
                    </div>
                    <div className="bg-primary text-white p-2 rounded-lg">
                      <Video className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {meeting.participants ? (
                      meeting.participants.slice(0, 4).map((participant: any, index: number) => (
                        <div key={index} className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-white">
                          {participant.firstName?.[0]}{participant.lastName?.[0]}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center text-gray-500 text-sm">
                        <Users className="h-4 w-4 mr-1" />
                        Participants not available
                      </div>
                    )}
                    
                    {meeting.participants && meeting.participants.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium">
                        +{meeting.participants.length - 4}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex justify-between">
                    <Button variant="link" className="text-sm text-primary p-0">
                      View Details
                    </Button>
                    <Button 
                      variant={isNow ? "default" : "outline"} 
                      size="sm"
                      className={isNow ? "bg-primary text-white" : "text-primary border-primary"}
                    >
                      {isNow ? "Join Now" : (meeting.zoomMeetingId ? "Join" : "Prepare")}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

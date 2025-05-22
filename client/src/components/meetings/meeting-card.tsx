import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Calendar, 
  Clock, 
  Trash2, 
  ExternalLink,
  FileEdit,
  UserCircle
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MeetingCardProps {
  meeting: any;
  onDelete: (meetingId: number) => void;
  currentUserRole: string;
  currentUserId: number;
  isPast?: boolean;
}

export default function MeetingCard({
  meeting,
  onDelete,
  currentUserRole,
  currentUserId,
  isPast = false,
}: MeetingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Format meeting time
  const formatMeetingTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // If same day
    if (start.toDateString() === end.toDateString()) {
      return {
        date: format(start, "EEEE, MMMM d, yyyy"),
        time: `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`
      };
    }
    
    // Different days
    return {
      date: `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
      time: `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`
    };
  };
  
  const { date, time } = formatMeetingTime(meeting.startTime, meeting.endTime);
  
  // Calculate duration in minutes
  const calculateDuration = () => {
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime);
    const durationMs = end.getTime() - start.getTime();
    return Math.round(durationMs / (1000 * 60));
  };
  
  const duration = calculateDuration();
  
  // Check if meeting is happening now
  const isMeetingNow = () => {
    const now = new Date();
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime);
    
    return start <= now && now <= end;
  };
  
  // Check if user has permission to delete meeting
  const canDeleteMeeting = () => {
    return (
      currentUserRole === 'super_admin' ||
      currentUserRole === 'company_admin' ||
      meeting.organizerId === currentUserId
    );
  };
  
  // Format duration string
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} min`;
  };
  
  // Join meeting handler
  const handleJoinMeeting = () => {
    if (meeting.zoomJoinUrl) {
      window.open(meeting.zoomJoinUrl, '_blank');
    } else {
      // Placeholder for when no Zoom link is available
      alert("Meeting link not available");
    }
  };

  return (
    <Card 
      className={`p-4 relative ${isHovered ? 'shadow-md' : ''} transition-shadow duration-200`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <h3 className="font-medium">{meeting.title}</h3>
            {isMeetingNow() && !isPast && (
              <Badge className="ml-2 bg-green-500">Live</Badge>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-1 flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {date}
          </div>
          <div className="text-sm text-gray-500 mt-1 flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {time} ({formatDuration(duration)})
          </div>
        </div>
        <div className="bg-primary text-white p-2 rounded-lg">
          <Video className="h-5 w-5" />
        </div>
      </div>
      
      {meeting.description && (
        <div className="mt-3 text-sm text-gray-600">
          <p className="line-clamp-2">{meeting.description}</p>
        </div>
      )}
      
      {meeting.participants && meeting.participants.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Participants:</div>
          <div className="flex flex-wrap gap-1">
            {meeting.participants.slice(0, 5).map((participant: any, index: number) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {participant.firstName?.[0]}{participant.lastName?.[0]}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{participant.firstName} {participant.lastName}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {meeting.participants.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                +{meeting.participants.length - 5}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-3 flex justify-between items-center">
        <div className="flex items-center text-sm text-gray-500">
          <UserCircle className="h-4 w-4 mr-1" />
          <span>Organizer: {meeting.organizerName || "Unknown"}</span>
        </div>
        
        <div className="flex space-x-2">
          {!isPast && meeting.zoomJoinUrl && (
            <Button 
              size="sm" 
              onClick={handleJoinMeeting}
              className={isMeetingNow() ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {isMeetingNow() ? "Join Now" : "Join"}
            </Button>
          )}
          
          {canDeleteMeeting() && (
            <Button 
              variant="destructive" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => onDelete(meeting.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import ScheduleMeeting from "@/components/meetings/schedule-meeting";
import MeetingCard from "@/components/meetings/meeting-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Meetings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Fetch meetings
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['/api/meetings'],
    enabled: !!user,
  });

  // Fetch users for participants selection
  const { data: availableUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Schedule meeting mutation
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (meetingData: any) => {
      const response = await apiRequest("POST", "/api/meetings", meetingData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setIsSchedulingMeeting(false);
      toast({
        title: "Success",
        description: "Meeting scheduled successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });

  // Delete meeting mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      await apiRequest("DELETE", `/api/meetings/${meetingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      setMeetingToDelete(null);
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meeting",
        variant: "destructive",
      });
    },
  });

  // Filter meetings based on active tab
  const now = new Date();
  const filteredMeetings = meetings.filter((meeting: any) => {
    const meetingDate = new Date(meeting.startTime);
    
    if (activeTab === 'upcoming') {
      return meetingDate > now;
    } else if (activeTab === 'past') {
      return meetingDate < now;
    }
    
    return true;
  });

  // Sort meetings by start date
  const sortedMeetings = [...filteredMeetings].sort((a: any, b: any) => {
    const dateA = new Date(a.startTime).getTime();
    const dateB = new Date(b.startTime).getTime();
    
    if (activeTab === 'upcoming') {
      return dateA - dateB; // Ascending for upcoming
    } else {
      return dateB - dateA; // Descending for past
    }
  });

  const handleScheduleMeeting = (meetingData: any) => {
    // Add company ID if user is not super admin
    let companyId = meetingData.companyId;
    if (!companyId && user?.companyId) {
      companyId = user.companyId;
    }
    
    const data = {
      ...meetingData,
      companyId,
    };
    
    scheduleMeetingMutation.mutate(data);
  };

  const handleDeleteMeeting = (meetingId: number) => {
    setMeetingToDelete(meetingId);
  };

  const confirmDeleteMeeting = () => {
    if (meetingToDelete) {
      deleteMeetingMutation.mutate(meetingToDelete);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Meetings</h1>
        <Button onClick={() => setIsSchedulingMeeting(true)} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Your Meetings</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="upcoming">
            <TabsList className="mb-6">
              <TabsTrigger 
                value="upcoming" 
                onClick={() => setActiveTab("upcoming")}
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                onClick={() => setActiveTab("past")}
              >
                Past
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upcoming" className="mt-0">
              {isLoading ? (
                <div className="text-center py-8">Loading meetings...</div>
              ) : sortedMeetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No upcoming meetings. Schedule one now!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedMeetings.map((meeting: any) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onDelete={handleDeleteMeeting}
                      currentUserRole={user?.role || ''}
                      currentUserId={user?.id || 0}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past" className="mt-0">
              {isLoading ? (
                <div className="text-center py-8">Loading meetings...</div>
              ) : sortedMeetings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No past meetings.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedMeetings.map((meeting: any) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onDelete={handleDeleteMeeting}
                      currentUserRole={user?.role || ''}
                      currentUserId={user?.id || 0}
                      isPast={true}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Schedule Meeting Modal */}
      {isSchedulingMeeting && (
        <ScheduleMeeting
          open={isSchedulingMeeting}
          onClose={() => setIsSchedulingMeeting(false)}
          onSubmit={handleScheduleMeeting}
          isSubmitting={scheduleMeetingMutation.isPending}
          availableUsers={availableUsers.filter((u: any) => u.id !== user?.id)}
          currentUserRole={user?.role || ''}
          currentCompanyId={user?.companyId || null}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!meetingToDelete} onOpenChange={() => setMeetingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this meeting and notify all participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMeeting}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

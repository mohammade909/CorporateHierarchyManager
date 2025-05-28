import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Loader } from 'lucide-react';
import { useZoomStore, ZoomMeeting } from '@/store/zoomStore';
import { MeetingCard } from '@/components/zoom/MeetingCard';
import { CreateMeetingModal } from '@/components/zoom/CreateMeetingModal';
import toast from 'react-hot-toast';

export const MeetingsPage: React.FC = () => {
  const { 
    meetings, 
    isLoading, 
    error, 
    fetchMeetings, 
    createMeeting, 
    deleteMeeting, 
    updateMeeting,
    clearError 
  } = useZoomStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null);

  useEffect(() => {
    fetchMeetings().catch(err => {
      toast.error('Failed to load meetings');
      console.error(err);
    });
  }, [fetchMeetings]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleCreateMeeting = async (data: any) => {
    try {
      await createMeeting(data);
      toast.success('Meeting created successfully!');
    } catch (error) {
      toast.error('Failed to create meeting');
      throw error;
    }
  };

  const handleUpdateMeeting = async (data: any) => {
    if (!editingMeeting) return;
    
    try {
      await updateMeeting(editingMeeting.id, data);
      toast.success('Meeting updated successfully!');
      setEditingMeeting(null);
    } catch (error) {
      toast.error('Failed to update meeting');
      throw error;
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    
    try {
      await deleteMeeting(meetingId);
      toast.success('Meeting deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete meeting');
    }
  };

  const handleEditMeeting = (meeting: ZoomMeeting) => {
    setEditingMeeting(meeting);
  };

  if (isLoading && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-600 mt-1">Manage your Zoom meetings</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings scheduled</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first meeting.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Create Meeting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              onEdit={handleEditMeeting}
              onDelete={handleDeleteMeeting}
            />
          ))}
        </div>
      )}

      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateMeeting}
      />

      <CreateMeetingModal
        isOpen={!!editingMeeting}
        onClose={() => setEditingMeeting(null)}
        onSubmit={handleUpdateMeeting}
        initialData={editingMeeting ? {
          topic: editingMeeting.topic,
          start_time: editingMeeting.start_time,
          duration: editingMeeting.duration,
          password: editingMeeting.password,
        } : undefined}
        isEditing={true}
      />
    </div>
  );
};
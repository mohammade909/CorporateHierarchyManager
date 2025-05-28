import React, { useState } from 'react';
import { Calendar, Clock, Users, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { ZoomMeeting } from '@/store/zoomStore';
import { format } from 'date-fns';

interface MeetingCardProps {
  meeting: ZoomMeeting;
  onEdit: (meeting: ZoomMeeting) => void;
  onDelete: (meetingId: string) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onEdit, onDelete }) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleJoinMeeting = () => {
    window.open(meeting.join_url, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900 truncate">{meeting.topic}</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(meeting)}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(meeting.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          {format(new Date(meeting.start_time), 'PPP')}
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          {format(new Date(meeting.start_time), 'p')} • {meeting.duration} minutes
        </div>

        <div className="flex items-center text-sm text-gray-600">
          <Users className="h-4 w-4 mr-2" />
          Meeting ID: {meeting.id}
        </div>

        {meeting.password && (
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">Password:</span>
            <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
              {showPassword ? meeting.password : '••••••'}
            </span>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={handleJoinMeeting}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Join Meeting
        </button>
      </div>
    </div>
  );
};
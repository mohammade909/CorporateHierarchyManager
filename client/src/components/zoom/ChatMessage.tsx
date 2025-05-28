import React from 'react';
import { ZoomMessage } from '@/store/zoomStore';
import { format } from 'date-fns';
import { Volume2, FileText } from 'lucide-react';

interface ChatMessageProps {
  message: ZoomMessage;
  isOwn: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwn }) => {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'voice':
        return (
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4" />
            <span>Voice message</span>
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>File attachment</span>
          </div>
        );
      default:
        return <span>{message.message}</span>;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        <div className="text-sm">
          {renderMessageContent()}
        </div>
        <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
          {format(new Date(message.date_time), 'p')}
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/use-recording';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, disabled }) => {
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecording();

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const handleStopAndSend = async () => {
    try {
      const audioBlob = await stopRecording();
      await onSendVoice(audioBlob);
    } catch (error) {
      console.error('Failed to send voice message:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2 flex-1">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-red-700">Recording: {formatTime(recordingTime)}</span>
        </div>
        <button
          onClick={handleStopAndSend}
          className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
          title="Send voice message"
        >
          <Send className="h-4 w-4" />
        </button>
        <button
          onClick={cancelRecording}
          className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700"
          title="Cancel recording"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleStartRecording}
      disabled={disabled}
      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      title="Record voice message"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
};
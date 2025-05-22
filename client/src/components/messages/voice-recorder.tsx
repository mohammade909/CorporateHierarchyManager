import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Trash2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface VoiceRecorderProps {
  onStop: (audioBlob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

export default function VoiceRecorder({
  onStop,
  onCancel,
  maxDuration = 60, // default max duration is 60 seconds
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Start recording
  useEffect(() => {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(audioBlob);
          
          // Stop all tracks in the stream to release the microphone
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current.start();
        setIsRecording(true);
        
        // Set up timer
        timerRef.current = window.setInterval(() => {
          setRecordingTime((prev) => {
            if (prev >= maxDuration) {
              handleStopRecording();
              return prev;
            }
            return prev + 1;
          });
        }, 1000);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        onCancel();
      }
    };
    
    startRecording();
    
    return () => {
      // Clean up
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [maxDuration, onCancel]);

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSendRecording = () => {
    if (audioBlob) {
      setIsProcessing(true);
      
      // Add a slight delay to show processing state
      setTimeout(() => {
        onStop(audioBlob);
        setIsProcessing(false);
      }, 500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 border-t border-gray-200">
      <div className="flex items-center">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            {isRecording ? (
              <>
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2" />
                <span className="text-sm font-medium">Recording...</span>
              </>
            ) : (
              <span className="text-sm font-medium">Recording complete</span>
            )}
            <span className="ml-auto text-sm">
              {formatTime(recordingTime)} / {formatTime(maxDuration)}
            </span>
          </div>
          <Progress value={(recordingTime / maxDuration) * 100} />
        </div>
        
        <div className="ml-4 flex space-x-2">
          {isRecording ? (
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={handleStopRecording}
            >
              <Square className="h-5 w-5" />
            </Button>
          ) : (
            <>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={onCancel}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <Button 
                variant="default" 
                size="icon" 
                onClick={handleSendRecording}
                disabled={isProcessing || !audioBlob}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

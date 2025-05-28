import { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Mic, 
  MicOff, 
  Play,
  Square,
  Loader2,
  User
} from "lucide-react";
import VoiceRecorder from "@/components/messages/voice-recorder";
import { formatDistanceToNow } from "date-fns";

// Type definitions
interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: 'text' | 'voice';
  isRead: boolean;
  createdAt: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
  companyId: number;
  managerId?: number;
}

interface MessageDetailProps {
  conversation: Message[];
  selectedUser: User | null;
  currentUser: User | null;
  onSendMessage: (content: string, type: "text" | "voice") => void;
  isLoading: boolean;
}

export default function MessageDetail({
  conversation,
  selectedUser,
  currentUser,
  onSendMessage,
  isLoading,
}: MessageDetailProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize conversation length to prevent unnecessary re-renders
  const conversationLength = useMemo(() => conversation.length, [conversation]);
  const lastMessageId = useMemo(() => 
    conversation.length > 0 ? conversation[conversation.length - 1].id : null, 
    [conversation]
  );


  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current && conversationLength > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationLength, lastMessageId, message]);

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message, "text");
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVoiceMessageSent = (audioBlob: Blob) => {
    // Convert blob to base64 for sending over WebSocket
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Content = base64data.split(",")[1];
      onSendMessage(base64Content, "voice");
    };
  };

  const formatUserRole = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "company_admin": return "Company Admin";
      case "manager": return "Manager";
      case "employee": return "Employee";
      default: return role;
    }
  };

  // Function to play voice message
  const playVoiceMessage = (content: string) => {
    try {
      const audio = new Audio(`data:audio/webm;base64,${content}`);
      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
      });
    } catch (error) {
      console.error("Error creating audio element:", error);
    }
  };

  if (!selectedUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500">
        <User className="h-16 w-16 mb-4" />
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
          {selectedUser.firstName?.[0] || ""}{selectedUser.lastName?.[0] || ""}
        </div>
        <div className="ml-3">
          <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
          <p className="text-xs text-gray-500">{formatUserRole(selectedUser.role)}</p>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            conversation.map((msg: Message) => {
              const isSentByMe = msg.senderId === currentUser?.id;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[75%] p-3 rounded-lg ${
                      isSentByMe 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}
                  >
                    {msg.type === "text" ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="flex items-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`p-1 h-8 w-8 rounded-full ${isSentByMe ? 'text-white hover:text-white hover:bg-primary-dark' : 'text-gray-800 hover:bg-gray-300'}`}
                          onClick={() => playVoiceMessage(msg.content)}
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                        <span className="ml-2 text-sm">Voice message</span>
                      </div>
                    )}
                    <p className={`text-xs mt-1 ${isSentByMe ? 'text-primary-foreground/80' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {/* Input Area */}
      {isRecording ? (
        <VoiceRecorder 
          onStop={handleVoiceMessageSent} 
          onCancel={() => setIsRecording(false)} 
        />
      ) : (
        <div className="p-4 border-t border-gray-200 flex items-center">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 mr-2"
          />
          <Button 
            variant="outline" 
            size="icon" 
            className="mr-2" 
            onClick={() => setIsRecording(true)}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Button onClick={handleSendMessage} disabled={!message.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
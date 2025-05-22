import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "./auth";
import { useToast } from "../hooks/use-toast";

interface WebSocketContextType {
  sendMessage: (receiverId: number, content: string, type: "text" | "voice") => void;
  connectionStatus: "connected" | "disconnected" | "connecting";
}

interface WebSocketMessage {
  type: string;
  content?: string;
  senderId?: number;
  receiverId?: number;
  messageId?: number;
  timestamp?: string;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected");
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      return;
    }

    const connectWebSocket = () => {
      // Create WebSocket connection
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setConnectionStatus("connecting");

      ws.onopen = () => {
        console.log("WebSocket connection established");
        setConnectionStatus("connected");
        
        // Send authentication message once connected
        ws.send(JSON.stringify({
          type: "status",
          senderId: user.id
        }));
        
        // Set up ping interval for connection health check
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
        
        // Clean up ping interval when websocket closes
        return () => clearInterval(pingInterval);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Handle different message types
          if (message.type === "text" || message.type === "voice") {
            // Handle new message notification
            const senderName = message.senderId?.toString() || "Someone";
            const messageType = message.type === "text" ? "text message" : "voice message";
            
            // Show notification toast
            toast({
              title: "New Message",
              description: `${senderName} sent you a ${messageType}`,
              variant: "default",
            });
            
            // Here you would also typically update your message state/store
          } else if (message.type === "meeting_invite") {
            // Handle meeting invitation
            toast({
              title: "Meeting Invitation",
              description: `You've been invited to "${message.content}"`,
              variant: "default",
            });
          } else if (message.type === "error") {
            console.error("WebSocket error:", message.content);
            toast({
              title: "Communication Error",
              description: message.content,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setConnectionStatus("disconnected");
        
        // Attempt to reconnect after delay
        setTimeout(() => {
          if (user) {
            connectWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("disconnected");
      };
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [user, toast]);

  const sendMessage = (receiverId: number, content: string, type: "text" | "voice") => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "You are not connected to the server. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    wsRef.current.send(JSON.stringify({
      type,
      senderId: user?.id,
      receiverId,
      content
    }));
  };

  return (
    <WebSocketContext.Provider value={{ sendMessage, connectionStatus }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
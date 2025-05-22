import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/lib/websocket";
import MessageList from "@/components/messages/message-list";
import MessageDetail from "@/components/messages/message-detail";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const { sendMessage } = useWebSocket();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  // Fetch all users that the current user can communicate with
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Filter users based on communication permissions
  const availableUsers = allUsers.filter((otherUser: any) => {
    // Don't include self
    if (otherUser.id === user?.id) return false;

    // Check permissions based on role
    if (user?.role === 'super_admin') return true;

    // Users must be in the same company
    if (otherUser.companyId !== user?.companyId) return false;

    // Company admin can communicate with anyone in their company
    if (user?.role === 'company_admin') return true;

    // Manager can communicate with their assigned employees and company admin
    if (user?.role === 'manager') {
      return otherUser.role === 'company_admin' || 
             (otherUser.role === 'employee' && otherUser.managerId === user.id);
    }

    // Employee can communicate with their manager and company admin
    if (user?.role === 'employee') {
      return otherUser.role === 'company_admin' || 
             (otherUser.role === 'manager' && user.managerId === otherUser.id);
    }

    return false;
  });

  // Fetch messages for current user
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });

  // Fetch conversation with selected user
  const { data: conversation = [], isLoading: isLoadingConversation, refetch: refetchConversation } = useQuery({
    queryKey: ['/api/messages/conversation', selectedUserId],
    enabled: !!selectedUserId,
  });

  // Group messages by conversation
  useEffect(() => {
    if (messages.length > 0 && availableUsers.length > 0) {
      const conversationMap = new Map();
      
      messages.forEach((message: any) => {
        const otherUserId = message.senderId === user?.id ? message.receiverId : message.senderId;
        const otherUser = availableUsers.find((u: any) => u.id === otherUserId);
        
        if (otherUser) {
          if (!conversationMap.has(otherUser.id)) {
            conversationMap.set(otherUser.id, {
              id: otherUser.id,
              name: `${otherUser.firstName} ${otherUser.lastName}`,
              role: otherUser.role,
              lastMessage: message,
              unreadCount: message.receiverId === user?.id && !message.isRead ? 1 : 0,
            });
          } else {
            const conv = conversationMap.get(otherUser.id);
            
            // Check if this message is newer than the last one
            if (new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
              conv.lastMessage = message;
            }
            
            // Count unread messages
            if (message.receiverId === user?.id && !message.isRead) {
              conv.unreadCount += 1;
            }
          }
        }
      });
      
      // Convert to array and sort by last message date
      const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      });
      
      setConversations(sortedConversations);
    }
  }, [messages, availableUsers, user]);

  const handleSendMessage = async (content: string, type: "text" | "voice") => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "No recipient selected",
        variant: "destructive",
      });
      return;
    }

    try {
      sendMessage(selectedUserId, content, type);
      // Refetch conversation to get the new message
      setTimeout(() => {
        refetchConversation();
      }, 500);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Messages</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-13rem)]">
        {/* Conversations List */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <CardContent className="p-4 h-full">
              <MessageList
                conversations={conversations}
                availableUsers={availableUsers} 
                selectedUserId={selectedUserId}
                onSelectUser={handleSelectUser}
                isLoading={isLoadingMessages}
              />
            </CardContent>
          </Card>
        </div>

        {/* Message Detail */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <MessageDetail
                conversation={conversation}
                selectedUser={availableUsers.find((u: any) => u.id === selectedUserId)}
                currentUser={user}
                onSendMessage={handleSendMessage}
                isLoading={isLoadingConversation}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

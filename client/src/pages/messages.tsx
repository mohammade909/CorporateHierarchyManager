import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useWebSocket } from "@/lib/websocket";
import MessageList from "@/components/messages/message-list";
import MessageDetail from "@/components/messages/message-detail";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Type definitions
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
  companyId: number;
  managerId?: number;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  type: 'text' | 'voice';
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  id: number;
  name: string;
  role: string;
  lastMessage: Message;
  unreadCount: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { sendMessage, lastMessage } = useWebSocket(); // Assuming useWebSocket returns lastMessage
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Fetch all users that the current user can communicate with
  const { data: allUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Fetch messages for current user
  const { data: messagesData, isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user,
    // Add refetch options for real-time updates
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
    refetchOnWindowFocus: true,
  });

  // Listen for WebSocket messages and update the query cache
  useEffect(() => {
    if (lastMessage) {
      // Invalidate and refetch messages query
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    }
  }, [lastMessage, queryClient]);

  // Alternative: Optimistically update the cache
  const updateMessagesCache = useCallback((newMessage: Message) => {
    queryClient.setQueryData(['/api/messages'], (oldData: Message[] | undefined) => {
      if (!oldData) return [newMessage];
      
      // Check if message already exists (to prevent duplicates)
      const exists = oldData.some(msg => msg.id === newMessage.id);
      if (exists) return oldData;
      
      return [...oldData, newMessage];
    });
  }, [queryClient]);

  // Type guard and safe casting with stability
  const allUsers: User[] = useMemo(() => {
    return Array.isArray(allUsersData) ? allUsersData as User[] : [];
  }, [allUsersData]);

  const messages: Message[] = useMemo(() => {
    return Array.isArray(messagesData) ? messagesData as Message[] : [];
  }, [messagesData]);

  // Memoize expensive computations with stable dependencies
  const availableUsers = useMemo(() => {
    if (!user || allUsers.length === 0) return [];
    
    return allUsers.filter((otherUser: User) => {
      // Don't include self
      if (otherUser.id === user.id) return false;

      // Check permissions based on role
      if (user.role === 'super_admin') return true;

      // Users must be in the same company
      if (otherUser.companyId !== user.companyId) return false;

      // Company admin can communicate with anyone in their company
      if (user.role === 'company_admin') return true;

      // Manager can communicate with their assigned employees and company admin
      if (user.role === 'manager') {
        return otherUser.role === 'company_admin' || 
               (otherUser.role === 'employee' && otherUser.managerId === user.id);
      }

      // Employee can communicate with their manager and company admin
      if (user.role === 'employee') {
        return otherUser.role === 'company_admin' || 
               (otherUser.role === 'manager' && user.managerId === otherUser.id);
      }

      return false;
    });
  }, [allUsers, user]);

  // Memoize selected user to prevent unnecessary re-renders
  const selectedUser = useMemo(() => {
    return allUsers.find((u: User) => u.id === selectedUserId) || null;
  }, [allUsers, selectedUserId]);

  // Filter messages to get conversation with selected user
  const conversation: Message[] = useMemo(() => {
    if (!selectedUserId || !user || messages.length === 0) return [];
    
    return messages
      .filter((message: Message) => 
        (message.senderId === user.id && message.receiverId === selectedUserId) ||
        (message.senderId === selectedUserId && message.receiverId === user.id)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedUserId, user]);

  // Create stable conversations list
  const conversations = useMemo(() => {
    const conversationMap = new Map<number, Conversation>();
    
    // Early return if no data
    if (!user || allUsers.length === 0) {
      console.log("No user or allUsers data yet");
      return [];
    }
    
    // First, create conversations from existing messages
    if (messages.length > 0) {
      console.log("Building conversations from messages:", messages.length);
      
      messages.forEach((message: Message) => {
        // Determine the other user in the conversation
        const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
        
        // Find the other user in ALL users
        const otherUser = allUsers.find((u: User) => u.id === otherUserId);
        
        if (otherUser) {
          if (!conversationMap.has(otherUser.id)) {
            // Create new conversation
            conversationMap.set(otherUser.id, {
              id: otherUser.id,
              name: `${otherUser.firstName} ${otherUser.lastName}`,
              role: otherUser.role,
              lastMessage: message,
              unreadCount: message.receiverId === user.id && !message.isRead ? 1 : 0,
            });
          } else {
            // Update existing conversation
            const conv = conversationMap.get(otherUser.id)!;
            
            // Check if this message is newer than the last one
            if (new Date(message.createdAt) > new Date(conv.lastMessage.createdAt)) {
              conv.lastMessage = message;
            }
            
            // Count unread messages
            if (message.receiverId === user.id && !message.isRead) {
              conv.unreadCount += 1;
            }
          }
        }
      });
    }
    
    // Then, add available users who don't have existing conversations
    if (availableUsers.length > 0) {
      availableUsers.forEach((availableUser: User) => {
        if (!conversationMap.has(availableUser.id)) {
          conversationMap.set(availableUser.id, {
            id: availableUser.id,
            name: `${availableUser.firstName} ${availableUser.lastName}`,
            role: availableUser.role,
            lastMessage: {
              id: -1, // Temporary ID for placeholder
              senderId: -1,
              receiverId: -1,
              content: "Start a conversation...",
              type: 'text',
              isRead: true,
              createdAt: new Date(0).toISOString(), // Very old date so it appears at bottom
            },
            unreadCount: 0,
          });
        }
      });
    }
    
    // Convert to array and sort: conversations with messages first, then available users
    const sortedConversations = Array.from(conversationMap.values()).sort((a, b) => {
      // If both have real messages, sort by date
      if (a.lastMessage.id !== -1 && b.lastMessage.id !== -1) {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      }
      // If one has messages and other doesn't, prioritize the one with messages
      if (a.lastMessage.id !== -1 && b.lastMessage.id === -1) {
        return -1;
      }
      if (a.lastMessage.id === -1 && b.lastMessage.id !== -1) {
        return 1;
      }
      // If both are available users without messages, sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    console.log("Combined conversations:", sortedConversations.length);
    return sortedConversations;
  }, [messages, allUsers, availableUsers, user]);

  const handleSendMessage = useCallback(async (content: string, type: "text" | "voice") => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "No recipient selected",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendMessage(selectedUserId, content, type);
      
      // Option 1: Immediately refetch messages
      refetchMessages();
      
      // Option 2: Or optimistically update with a temporary message
      // const tempMessage: Message = {
      //   id: Date.now(), // Temporary ID
      //   senderId: user!.id,
      //   receiverId: selectedUserId,
      //   content,
      //   type,
      //   isRead: false,
      //   createdAt: new Date().toISOString(),
      // };
      // updateMessagesCache(tempMessage);
      
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  }, [selectedUserId, sendMessage, toast, refetchMessages]);

  const handleSelectUser = useCallback((userId: number) => {
    setSelectedUserId(userId);
  }, []);

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
                selectedUser={selectedUser}
                currentUser={user}
                onSendMessage={handleSendMessage}
                isLoading={isLoadingMessages}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
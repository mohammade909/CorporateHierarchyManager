import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { MessageSquare, Mic } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface RecentCommunicationsProps {
  messages: any[];
}

export default function RecentCommunications({ messages }: RecentCommunicationsProps) {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [recentConversations, setRecentConversations] = useState<any[]>([]);

  // Fetch users to get names for the conversations
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user,
  });

  // Process messages into conversations
  useEffect(() => {
    if (messages.length > 0 && users.length > 0) {
      // Group by conversation partner
      const conversations = new Map();
      
      messages.forEach((message) => {
        const isOutgoing = message.senderId === user?.id;
        const partnerId = isOutgoing ? message.receiverId : message.senderId;
        
        // Find the conversation partner from users
        const partner = users.find((u) => u.id === partnerId);
        if (!partner) return;
        
        if (!conversations.has(partnerId)) {
          conversations.set(partnerId, {
            id: partnerId,
            name: `${partner.firstName} ${partner.lastName}`,
            role: partner.role,
            latestMessage: message,
          });
        } else {
          const existing = conversations.get(partnerId);
          if (new Date(message.createdAt) > new Date(existing.latestMessage.createdAt)) {
            existing.latestMessage = message;
          }
        }
      });
      
      // Sort by latest message date and take only the first few
      const sortedConversations = Array.from(conversations.values())
        .sort((a, b) => {
          return new Date(b.latestMessage.createdAt).getTime() - 
                 new Date(a.latestMessage.createdAt).getTime();
        })
        .slice(0, 3); // Show only the 3 most recent conversations
      
      setRecentConversations(sortedConversations);
    }
  }, [messages, users, user]);

  const formatRole = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "company_admin": return "Company Admin";
      case "manager": return "Manager";
      case "employee": return "Employee";
      default: return role;
    }
  };

  return (
    <Card>
      <CardHeader className="p-5 border-b border-gray-200 flex justify-between items-center">
        <CardTitle>Recent Communications</CardTitle>
        <Button variant="link" className="text-primary text-sm p-0" onClick={() => navigate("/messages")}>
          Go to Messages
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        <div className="space-y-4">
          {recentConversations.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No recent communications</p>
          ) : (
            recentConversations.map((conversation) => {
              const message = conversation.latestMessage;
              const isOutgoing = message.senderId === user?.id;
              
              return (
                <div 
                  key={conversation.id} 
                  className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => navigate(`/messages?userId=${conversation.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-white font-semibold">
                        {conversation.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-sm">{conversation.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatRole(conversation.role)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="mt-2">
                    {message.type === "text" ? (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {isOutgoing ? "You: " : ""}{message.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Mic className="h-4 w-4 mr-1" />
                        {isOutgoing ? "You sent a" : "Received a"} voice message
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex space-x-2">
                      <span className="inline-block px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600 flex items-center">
                        {message.type === "text" ? (
                          <MessageSquare className="h-3 w-3 mr-1" />
                        ) : (
                          <Mic className="h-3 w-3 mr-1" />
                        )}
                        {message.type === "text" ? "Text" : "Voice"}
                      </span>
                    </div>
                    <Button variant="link" className="text-primary text-sm p-0">
                      {isOutgoing ? "View" : "Reply"}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

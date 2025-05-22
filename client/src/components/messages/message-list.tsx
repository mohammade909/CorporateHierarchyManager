import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UserPlus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

interface MessageListProps {
  conversations: any[];
  availableUsers: any[];
  selectedUserId: number | null;
  onSelectUser: (userId: number) => void;
  isLoading: boolean;
}

export default function MessageList({
  conversations,
  availableUsers,
  selectedUserId,
  onSelectUser,
  isLoading,
}: MessageListProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);

  // Filter available users for new message
  const filteredUsers = availableUsers.filter((availableUser) => {
    // Don't include current user
    if (availableUser.id === user?.id) return false;
    
    // Search by name
    const fullName = `${availableUser.firstName} ${availableUser.lastName}`.toLowerCase();
    const role = availableUser.role.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || role.includes(query);
  });

  // Get user's initials
  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  };

  // Format user role
  const formatRole = (role: string) => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "company_admin": return "Company Admin";
      case "manager": return "Manager";
      case "employee": return "Employee";
      default: return role;
    }
  };

  // Function to get message preview
  const getMessagePreview = (message: any) => {
    if (message.type === "voice") {
      return "Voice message";
    }
    
    if (message.content.length > 30) {
      return message.content.substring(0, 30) + "...";
    }
    
    return message.content;
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Loading conversations...</div>;
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={() => setShowNewMessage(true)}
          >
            <UserPlus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">New</span>
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No conversations yet. Start a new message!
            </div>
          ) : (
            <div className="space-y-2">
              {conversations
                .filter((conv) => {
                  if (!searchQuery) return true;
                  return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map((conv) => (
                  <div
                    key={conv.id}
                    className={`p-3 rounded-lg hover:bg-gray-100 cursor-pointer flex ${
                      selectedUserId === conv.id ? "bg-gray-100" : ""
                    }`}
                    onClick={() => onSelectUser(conv.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {getUserInitials(conv.name.split(" ")[0], conv.name.split(" ")[1])}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="font-medium text-sm truncate">{conv.name}</p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{formatRole(conv.role)}</p>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conv.lastMessage.senderId === user?.id ? "You: " : ""}
                        {getMessagePreview(conv.lastMessage)}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-2 self-center">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Select a user to start a conversation with.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative my-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  No users found matching your search.
                </div>
              ) : (
                filteredUsers.map((availableUser) => (
                  <div
                    key={availableUser.id}
                    className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer flex"
                    onClick={() => {
                      onSelectUser(availableUser.id);
                      setShowNewMessage(false);
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                      {getUserInitials(availableUser.firstName, availableUser.lastName)}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-sm">
                        {availableUser.firstName} {availableUser.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{formatRole(availableUser.role)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMessage(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

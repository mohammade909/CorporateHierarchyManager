import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Bell, HelpCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/layout/theme-provider";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface NavbarProps {
  toggleSidebar: () => void;
}

export default function Navbar({ toggleSidebar }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  
  // Get unread notifications
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });
  
  const { data: meetings = [] } = useQuery({
    queryKey: ['/api/meetings'],
    enabled: !!user,
  });
  
  const unreadMessages = messages.filter((msg: any) => !msg.isRead && msg.receiverId === user?.id).length;
  
  // Count upcoming meetings (within 24 hours)
  const upcomingMeetings = meetings.filter((meeting: any) => {
    const meetingTime = new Date(meeting.startTime).getTime();
    const now = new Date().getTime();
    const in24Hours = now + (24 * 60 * 60 * 1000);
    return meetingTime > now && meetingTime < in24Hours;
  }).length;
  
  const totalNotifications = unreadMessages + upcomingMeetings;
  
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log("Searching for:", searchQuery);
    // Navigate to search results page or filter current page
  };
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  return (
    <header className="bg-white shadow-sm z-10 dark:bg-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Mobile Menu Trigger */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden" 
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch}>
            <Input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </form>
        </div>
        
        {/* Top Nav Items */}
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs" 
                variant="destructive"
              >
                {totalNotifications}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Help"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

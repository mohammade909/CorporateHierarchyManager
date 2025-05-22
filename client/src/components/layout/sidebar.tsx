import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building2,
  Network,
  MessageSquare,
  Video,
  BarChart,
  Settings,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  
  // Get unread message count
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });
  
  const unreadMessages = messages.filter((msg: any) => !msg.isRead && msg.receiverId === user?.id).length;
  
  // Get navigation items based on user role
  const navigationItems = getNavigationItems(user?.role || "");
  
  return (
    <aside 
      className={cn(
        "bg-white w-64 h-full shadow-md flex-shrink-0 fixed inset-y-0 left-0 z-30 lg:relative lg:translate-x-0",
        "transform transition-transform duration-200 ease-in-out",
        {
          "translate-x-0": isOpen,
          "-translate-x-full lg:translate-x-0": !isOpen,
        }
      )}
    >
      <div className="flex flex-col h-full">
        {/* Company Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white font-bold">
              CH
            </div>
            <div className="font-semibold text-lg text-gray-800">CorporateHierarchy</div>
          </div>
        </div>
        
        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
              {user?.firstName?.charAt(0) || ""}{user?.lastName?.charAt(0) || ""}
            </div>
            <div className="ml-3">
              <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">{formatRole(user?.role || "")}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="px-2 space-y-1">
            {navigationItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path} 
                  className={cn(
                    "flex items-center px-4 py-2 text-sm rounded-md font-medium",
                    "transition-colors duration-200",
                    location === item.path
                      ? "bg-primary-50 border-l-4 border-primary text-primary"
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <Badge className="ml-auto" variant="destructive">
                      {item.badge === "messages" ? unreadMessages : ""}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-600 hover:text-gray-900 px-4"
            onClick={logout}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}

function getNavigationItems(role: string) {
  const items = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      path: "/messages",
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
      badge: "messages",
    },
    {
      path: "/meetings",
      label: "Meetings",
      icon: <Video className="h-5 w-5" />,
    },
    {
      path: "/organization-chart",
      label: "Organization Chart",
      icon: <Network className="h-5 w-5" />,
    },
  ];

  // Add role-specific items
  if (role === "super_admin" || role === "company_admin") {
    items.splice(1, 0, {
      path: "/user-management",
      label: "User Management",
      icon: <Users className="h-5 w-5" />,
    });
    
    items.splice(2, 0, {
      path: "/company-profile",
      label: "Company Profile",
      icon: <Building2 className="h-5 w-5" />,
    });
  }
  
  // Add reports for certain roles
  if (role === "super_admin" || role === "company_admin" || role === "manager") {
    items.push({
      path: "/reports",
      label: "Reports",
      icon: <BarChart className="h-5 w-5" />,
    });
  }
  
  // Add settings for all users
  items.push({
    path: "/settings",
    label: "Settings",
    icon: <Settings className="h-5 w-5" />,
  });

  return items;
}

function formatRole(role: string): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "company_admin":
      return "Company Admin";
    case "manager":
      return "Manager";
    case "employee":
      return "Employee";
    default:
      return role;
  }
}

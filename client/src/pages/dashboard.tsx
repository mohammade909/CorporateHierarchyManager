import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import StatsCard from "@/components/dashboard/stats-card";
import OrganizationChart from "@/components/dashboard/organization-chart";
import ActivityFeed from "@/components/dashboard/activity-feed";
import RecentCommunications from "@/components/dashboard/recent-communications";
import UpcomingMeetings from "@/components/dashboard/upcoming-meetings";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7");

  // Fetch dashboard data based on user role
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['/api/dashboard', user?.role, user?.companyId, timeRange],
    queryFn: async () => {
      // In a real implementation, this would call the actual API endpoint
      // This is a placeholder that returns mock data
      return {
        stats: {
          totalUsers: 256,
          activeManagers: 35,
          newMessages: 78,
          upcomingMeetings: 12
        },
        recentActivities: [
          { 
            id: 1,
            type: "user_added",
            actor: "Maria Garcia",
            subject: "Jason Lee",
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            type: "meeting_scheduled",
            actor: "David Kim",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 3,
            type: "message_sent",
            actor: "Alex Rodriguez",
            targetGroup: "Sales team",
            messageType: "voice",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 4,
            type: "profile_updated",
            actor: "Sarah Johnson",
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      };
    },
    enabled: !!user,
  });

  // Fetch messages for the current user
  const { data: messages } = useQuery({
    queryKey: ['/api/messages'],
    enabled: !!user,
  });

  // Fetch meetings for the current user
  const { data: meetings } = useQuery({
    queryKey: ['/api/meetings'],
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="p-8">Loading dashboard data...</div>;
  }

  // Determine dashboard title based on user role
  let dashboardTitle = "Dashboard";
  if (user?.role === "super_admin") {
    dashboardTitle = "Super Admin Dashboard";
  } else if (user?.role === "company_admin") {
    dashboardTitle = "Company Admin Dashboard";
  } else if (user?.role === "manager") {
    dashboardTitle = "Manager Dashboard";
  } else if (user?.role === "employee") {
    dashboardTitle = "Employee Dashboard";
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{dashboardTitle}</h1>
        <div className="flex space-x-2 mt-3 sm:mt-0">
          <div className="relative">
            <Select 
              value={timeRange} 
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last quarter</SelectItem>
                <SelectItem value="365">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="Total Users" 
          value={dashboardData?.stats.totalUsers || 0} 
          change={12} 
          icon="users" 
          iconBgColor="bg-blue-100" 
          iconColor="text-primary" 
        />
        <StatsCard 
          title="Active Managers" 
          value={dashboardData?.stats.activeManagers || 0} 
          change={5} 
          icon="supervisors" 
          iconBgColor="bg-green-100" 
          iconColor="text-success" 
        />
        <StatsCard 
          title="New Messages" 
          value={dashboardData?.stats.newMessages || 0} 
          change={-3} 
          icon="chat" 
          iconBgColor="bg-indigo-100" 
          iconColor="text-indigo-600" 
        />
        <StatsCard 
          title="Upcoming Meetings" 
          value={dashboardData?.stats.upcomingMeetings || 0} 
          change={18} 
          icon="video" 
          iconBgColor="bg-red-100" 
          iconColor="text-danger" 
        />
      </div>
      
      {/* Organization Chart & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <OrganizationChart />
        </div>
        <div>
          <ActivityFeed activities={dashboardData?.recentActivities || []} />
        </div>
      </div>
      
      {/* Communications & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentCommunications messages={messages || []} />
        <UpcomingMeetings meetings={meetings || []} />
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function OrganizationChart() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Fetch organization data based on the user's role and company
  const { data: organizationData, isLoading } = useQuery({
    queryKey: ['/api/users', user?.role, user?.companyId],
    enabled: !!user,
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[300px] flex items-center justify-center">
          <p>Loading organization data...</p>
        </CardContent>
      </Card>
    );
  }
  
  // For demo purposes, using static data
  // In a real implementation, this would use the actual organization data
  const adminName = "Sarah Johnson";
  const managers = [
    { name: "Alex Rodriguez", role: "Sales Manager" },
    { name: "Maria Garcia", role: "HR Manager" },
    { name: "David Kim", role: "Tech Manager" },
  ];
  const employees = [
    { name: "Mike Wilson", role: "Sales Rep", manager: "Alex Rodriguez" },
    { name: "Anna Lopez", role: "Sales Rep", manager: "Alex Rodriguez" },
    { name: "Lisa Chen", role: "HR Specialist", manager: "Maria Garcia" },
    { name: "Ryan Park", role: "Developer", manager: "David Kim" },
    { name: "Emma Brown", role: "Designer", manager: "David Kim" },
  ];
  
  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Organization Hierarchy</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="overflow-auto">
          <div className="flex flex-col items-center min-w-[600px]">
            {/* Company Admin Level */}
            <div className="w-48 p-3 border border-gray-300 rounded-lg bg-primary text-white text-center mb-8 relative">
              <div className="font-medium">{adminName}</div>
              <div className="text-xs opacity-80">Company Admin</div>
              {/* Connector */}
              <div className="absolute left-1/2 -bottom-8 w-0.5 h-8 bg-gray-300"></div>
            </div>
            
            {/* Managers Level */}
            <div className="flex justify-center space-x-10 mb-8">
              {managers.map((manager, index) => (
                <div key={index} className="relative">
                  <div className="w-40 p-3 border border-gray-300 rounded-lg bg-secondary text-white text-center">
                    <div className="font-medium">{manager.name}</div>
                    <div className="text-xs opacity-80">{manager.role}</div>
                  </div>
                  {/* Connector to top */}
                  <div className="absolute left-1/2 -top-8 w-0.5 h-8 bg-gray-300"></div>
                  {/* Connector to bottom */}
                  <div className="absolute left-1/2 -bottom-8 w-0.5 h-8 bg-gray-300"></div>
                </div>
              ))}
            </div>
            
            {/* Employees Level */}
            <div className="flex flex-wrap justify-center gap-3">
              {employees.map((employee, index) => (
                <div key={index} className="w-32 p-2 border border-gray-300 rounded-lg text-center relative">
                  <div className="font-medium text-sm">{employee.name}</div>
                  <div className="text-xs text-gray-500">{employee.role}</div>
                  {/* Connector to top */}
                  <div className="absolute left-1/2 -top-8 w-0.5 h-8 bg-gray-300 -translate-x-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <Button
            variant="link"
            className="flex items-center justify-center mx-auto text-primary"
            onClick={() => navigate("/organization-chart")}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            View Full Organization Chart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

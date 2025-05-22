import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";

export default function OrganizationChart() {
  const { user } = useAuth();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    user?.companyId || null
  );

  // Fetch companies (for super admin)
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    enabled: user?.role === 'super_admin',
  });

  // Fetch users for the selected company
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users', selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  const handleZoomIn = () => {
    if (zoomLevel < 150) {
      setZoomLevel(zoomLevel + 10);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(zoomLevel - 10);
    }
  };

  // Build the organization hierarchy
  const buildHierarchy = () => {
    if (!users.length) return { admins: [], managers: [], employees: [] };

    const admins = users.filter((u: any) => u.role === 'company_admin');
    const managers = users.filter((u: any) => u.role === 'manager');
    const employees = users.filter((u: any) => u.role === 'employee');

    return { admins, managers, employees };
  };

  const { admins, managers, employees } = buildHierarchy();

  // Group employees by manager
  const employeesByManager: Record<number, any[]> = {};
  employees.forEach((employee: any) => {
    if (employee.managerId) {
      if (!employeesByManager[employee.managerId]) {
        employeesByManager[employee.managerId] = [];
      }
      employeesByManager[employee.managerId].push(employee);
    }
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Organization Chart</h1>
        <div className="flex space-x-2 mt-3 sm:mt-0">
          {user?.role === 'super_admin' && (
            <Select
              value={selectedCompanyId?.toString() || ""}
              onValueChange={(value) => setSelectedCompanyId(Number(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company: any) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm">{zoomLevel}%</span>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Organizational Hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="p-5 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : !selectedCompanyId ? (
            <div className="text-center py-8 text-gray-500">
              {user?.role === 'super_admin'
                ? "Please select a company to view its organization chart."
                : "No company data available."}
            </div>
          ) : (
            <div 
              className="flex flex-col items-center min-h-[500px] py-8"
              style={{ 
                transform: `scale(${zoomLevel / 100})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.3s ease'
              }}
            >
              {/* Company Admin Level */}
              {admins.length > 0 && (
                <>
                  <div className="flex flex-wrap justify-center gap-4 mb-16">
                    {admins.map((admin: any) => (
                      <div key={admin.id} className="relative">
                        <div className="w-48 p-3 border border-gray-300 rounded-lg bg-primary text-white text-center">
                          <div className="font-medium">{admin.firstName} {admin.lastName}</div>
                          <div className="text-xs opacity-80">Company Admin</div>
                        </div>
                        {/* Connector to managers */}
                        {managers.length > 0 && (
                          <div className="absolute left-1/2 -bottom-16 w-0.5 h-16 bg-gray-300 -translate-x-1/2"></div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Managers Level */}
                  {managers.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-6 mb-16">
                      {managers.map((manager: any) => (
                        <div key={manager.id} className="relative">
                          <div className="w-40 p-3 border border-gray-300 rounded-lg bg-secondary text-white text-center">
                            <div className="font-medium">{manager.firstName} {manager.lastName}</div>
                            <div className="text-xs opacity-80">Manager</div>
                          </div>
                          {/* Connector to employees */}
                          {employeesByManager[manager.id]?.length > 0 && (
                            <div className="absolute left-1/2 -bottom-16 w-0.5 h-16 bg-gray-300 -translate-x-1/2"></div>
                          )}
                          
                          {/* Employees for this manager */}
                          {employeesByManager[manager.id]?.length > 0 && (
                            <div className="absolute left-1/2 -bottom-16 -translate-x-1/2">
                              <div className="flex flex-wrap justify-center gap-2 mt-16">
                                {employeesByManager[manager.id].map((employee: any) => (
                                  <div key={employee.id} className="relative">
                                    <div className="w-32 p-2 border border-gray-300 rounded-lg text-center bg-white">
                                      <div className="font-medium text-sm">{employee.firstName} {employee.lastName}</div>
                                      <div className="text-xs text-gray-500">Employee</div>
                                    </div>
                                    {/* Connector to manager */}
                                    <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-gray-300 -translate-x-1/2 -translate-y-4"></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

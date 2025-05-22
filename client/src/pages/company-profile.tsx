import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, Calendar, Clock } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  description: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompanyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch all companies for super admin
  const { data: allCompanies = [], isLoading: isLoadingAllCompanies } = useQuery({
    queryKey: ['/api/companies'],
    enabled: user?.role === 'super_admin',
  });
  
  // Fetch company details
  const { data: company, isLoading: isLoadingCompany } = useQuery({
    queryKey: ['/api/companies', user?.companyId],
    queryFn: async ({ queryKey }) => {
      const companyId = queryKey[1];
      if (!companyId) {
        throw new Error("No company ID available");
      }
      const response = await fetch(`/api/companies/${companyId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch company details");
      }
      
      return response.json();
    },
    enabled: !!user?.companyId && user?.role !== 'super_admin',
  });

  // Fetch company statistics
  const { data: companyStats } = useQuery({
    queryKey: ['/api/companies', user?.companyId, 'stats'],
    queryFn: async () => {
      // In a real implementation, this would be an API call.
      // For now, return mock data for demonstration
      return {
        totalUsers: 256,
        activeManagers: 35,
        totalMeetings: 152,
        avgMeetingDuration: 45,
      };
    },
    enabled: !!user?.companyId,
  });

  // Create company mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      try {
        console.log("Creating company with data:", data);
        // Get the token directly for debugging
        const token = localStorage.getItem("authToken");
        console.log("Using auth token:", token ? "Token exists" : "No token found");
        
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.");
        }
        
        // Make direct fetch call with explicit headers
        const response = await fetch(`/api/companies`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error:", response.status, errorText);
          
          // Handle specific error cases
          if (response.status === 401) {
            // Force logout and redirect to login page if unauthorized
            localStorage.removeItem("authToken");
            window.location.href = "/login";
            throw new Error("Session expired. Please log in again.");
          }
          
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log("Company creation response:", result);
        return result;
      } catch (error: any) {
        console.error("Error creating company:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Successfully created company:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Company created successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("Company creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });

  // Update company mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      const response = await apiRequest("PUT", `/api/companies/${user?.companyId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', user?.companyId] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Company profile updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company profile",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || "",
      description: company?.description || "",
    },
    values: {
      name: company?.name || "",
      description: company?.description || "",
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    updateCompanyMutation.mutate(data);
  };

  const isLoading = isLoadingCompany || isLoadingAllCompanies;
  
  // Handle company creation form submit
  const onCreateCompany = (data: CompanyFormValues) => {
    console.log("Form submitted with data:", data);
    createCompanyMutation.mutate(data);
  };
  
  if (isLoading && user?.role !== 'super_admin') {
    return <div className="p-8">Loading company details...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Company Profile</h1>
        {user?.role === 'super_admin' && (
          <Button onClick={() => setIsCreating(true)}>
            Create New Company
          </Button>
        )}
        {user?.role === 'company_admin' && !isEditing && company && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      {/* Company Create Modal for Super Admin */}
      {isCreating && (
        <Dialog open={isCreating} onOpenChange={() => setIsCreating(false)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Add a new company to the system. You can assign company admins to it later.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateCompany)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter company description"
                          className="resize-none"
                          rows={5}
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)} type="button">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCompanyMutation.isPending}
                    onClick={() => {
                      // Additional debug info
                      console.log("Form valid:", form.formState.isValid);
                      console.log("Form data:", form.getValues());
                      if (Object.keys(form.formState.errors).length > 0) {
                        console.log("Form errors:", form.formState.errors);
                      }
                    }}
                  >
                    {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Super Admin Company List */}
      {user?.role === 'super_admin' && (
        <Card className="mb-6">
          <CardHeader className="border-b border-gray-200">
            <CardTitle>All Companies</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {(!allCompanies || allCompanies.length === 0) ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No companies found. Create your first company to get started.</p>
              </div>
            ) : (
              <div className="divide-y">
                {Array.isArray(allCompanies) && allCompanies.map((company: any) => (
                  <div key={company.id} className="py-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{company.name}</h3>
                      <p className="text-sm text-gray-500">{company.description || "No description"}</p>
                      <p className="text-xs text-gray-400">Created: {new Date(company.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/user-management?companyId=${company.id}`}>
                      Manage Users
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Profile Card - Only shown for non-Super Admin users */}
      {user?.role !== 'super_admin' && (
        <Card className="mb-6">
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter company description"
                            className="resize-none"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)} type="button">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateCompanyMutation.isPending}>
                      {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Company Name</h3>
                  <p className="mt-1 text-lg">{company?.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="mt-1">{company?.description || "No description available."}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                  <p className="mt-1">
                    {company?.createdAt ? new Date(company.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <h3 className="text-2xl font-semibold mt-1">{companyStats?.totalUsers || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Managers</p>
              <h3 className="text-2xl font-semibold mt-1">{companyStats?.activeManagers || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Meetings</p>
              <h3 className="text-2xl font-semibold mt-1">{companyStats?.totalMeetings || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-white p-5">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Meeting Duration</p>
              <h3 className="text-2xl font-semibold mt-1">{companyStats?.avgMeetingDuration || 0} min</h3>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Clock className="h-6 w-6 text-danger" />
            </div>
          </div>
        </Card>
      </div>

      {/* Organization Structure - Only showing a preview on this page */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Organization Structure</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="mb-4 text-gray-600">
            View and manage your company's organizational structure.
          </p>
          <Button onClick={() => window.location.href = "/organization-chart"}>
            View Full Organization Chart
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

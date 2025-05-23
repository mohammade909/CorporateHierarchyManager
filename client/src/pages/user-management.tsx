import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import UserList from "@/components/user/user-list";
import UserForm from "@/components/user/user-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
export type User = {
  id: number;
  username: string;
  email: string;
  role: string;
  companyId?: number  ;
};
export interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  companies: Company[]; // Now properly typed as an array
  currentUserRole: string;
  currentCompanyId: number | null;
}
export interface Company {
  id: number;
  name: string;
  description:string;
  created_at:string
}
export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  // Fetch users based on current user's role
  const { data: users = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/users', user?.companyId],
    enabled: !!user,
  });
  

  

  // Fetch companies for super admin
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: user?.role === 'super_admin',
  });

  // Add user mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      try {
        console.log("Adding user with data:", userData);
        // Get the token directly for debugging
        const token = localStorage.getItem("authToken");
        console.log("Using auth token:", token ? "Token exists" : "No token found");
        
        if (!token) {
          throw new Error("Authentication token not found. Please log in again.");
        }
        
        // Make direct fetch call with explicit headers
        const response = await fetch(`/api/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(userData)
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
        console.log("User creation response:", result);
        return result;
      } catch (error: any) {
        console.error("Error adding user:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Successfully added user:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddingUser(false);
      toast({
        title: "Success",
        description: "User has been added successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("User addition error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user.",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setUserToDelete(null);
      toast({
        title: "Success",
        description: "User has been deleted successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  // Filter users based on active tab
  const filteredUsers = users.filter((u: any) => {
    if (activeTab === "all") return true;
    return u.role === activeTab;
  });

  const handleSubmitUser = (userData: any) => {
    // If company admin, automatically set company ID to their company
    if (user?.role === 'company_admin' && user.companyId) {
      userData.companyId = user.companyId;
    }
    
    addUserMutation.mutate(userData);
  };

  const handleDeleteUser = (userId: number) => {
    setUserToDelete(userId);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
    }
  };

  // Determine what tabs to show based on user role
  const getRoleTabs = () => {
    if (user?.role === 'super_admin') {
      return (
        <TabsList className="mb-6">
          <TabsTrigger value="all" onClick={() => setActiveTab("all")}>All</TabsTrigger>
          <TabsTrigger value="super_admin" onClick={() => setActiveTab("super_admin")}>Super Admins</TabsTrigger>
          <TabsTrigger value="company_admin" onClick={() => setActiveTab("company_admin")}>Company Admins</TabsTrigger>
          <TabsTrigger value="manager" onClick={() => setActiveTab("manager")}>Managers</TabsTrigger>
          <TabsTrigger value="employee" onClick={() => setActiveTab("employee")}>Employees</TabsTrigger>
        </TabsList>
      );
    }
    
    return (
      <TabsList className="mb-6">
        <TabsTrigger value="all" onClick={() => setActiveTab("all")}>All</TabsTrigger>
        <TabsTrigger value="manager" onClick={() => setActiveTab("manager")}>Managers</TabsTrigger>
        <TabsTrigger value="employee" onClick={() => setActiveTab("employee")}>Employees</TabsTrigger>
      </TabsList>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
        {(user?.role === 'super_admin' || user?.role === 'company_admin') && (
          <Button onClick={() => setIsAddingUser(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="all">
            {getRoleTabs()}
            <TabsContent value="all" className="mt-0">
              <UserList
                users={filteredUsers}
                isLoading={isLoadingUsers}
                companies={companies}
                onDelete={handleDeleteUser}
              />
            </TabsContent>
            <TabsContent value="super_admin" className="mt-0">
              <UserList
                users={filteredUsers}
                isLoading={isLoadingUsers}
                companies={companies}
                onDelete={handleDeleteUser}
              />
            </TabsContent>
            <TabsContent value="company_admin" className="mt-0">
              <UserList
                users={filteredUsers}
                isLoading={isLoadingUsers}
                companies={companies}
                onDelete={handleDeleteUser}
              />
            </TabsContent>
            <TabsContent value="manager" className="mt-0">
              <UserList
                users={filteredUsers}
                isLoading={isLoadingUsers}
                companies={companies}
                onDelete={handleDeleteUser}
              />
            </TabsContent>
            <TabsContent value="employee" className="mt-0">
              <UserList
                users={filteredUsers}
                isLoading={isLoadingUsers}
                companies={companies}
                onDelete={handleDeleteUser}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      {isAddingUser && (
        <UserForm
          open={isAddingUser}
          onClose={() => setIsAddingUser(false)}
          onSubmit={handleSubmitUser}
          isSubmitting={addUserMutation.isPending}
          companies={companies}
          currentUserRole={user?.role || ''}
          currentCompanyId={user?.companyId || null}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user and all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

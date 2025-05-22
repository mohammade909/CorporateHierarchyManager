import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import UserForm from "@/components/user/user-form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserListProps {
  users: any[];
  isLoading: boolean;
  companies: any[];
  onDelete: (userId: number) => void;
}

export default function UserList({
  users,
  isLoading,
  companies,
  onDelete,
}: UserListProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const { id, ...updateData } = userData;
      const response = await apiRequest("PUT", `/api/users/${id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setUserToEdit(null);
      toast({
        title: "Success",
        description: "User has been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user.",
        variant: "destructive",
      });
    },
  });

  // Get company name by ID
  const getCompanyName = (companyId: number | null) => {
    if (!companyId) return "N/A";
    const company = companies.find((c) => c.id === companyId);
    return company ? company.name : "Unknown";
  };

  // Get user initials for avatar
  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`;
  };

  // Format role for display
  const formatRole = (role: string) => {
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
  };

  // Check if current user can edit a user
  const canEditUser = (user: any) => {
    if (!currentUser) return false;
    
    // Super admin can edit anyone
    if (currentUser.role === "super_admin") return true;
    
    // Company admin can edit managers and employees in their company
    if (currentUser.role === "company_admin") {
      return (
        user.companyId === currentUser.companyId &&
        (user.role === "manager" || user.role === "employee")
      );
    }
    
    // Managers can only edit their employees
    if (currentUser.role === "manager") {
      return user.role === "employee" && user.managerId === currentUser.id;
    }
    
    return false;
  };

  // Check if current user can delete a user
  const canDeleteUser = (user: any) => {
    if (!currentUser) return false;
    
    // Can't delete yourself
    if (user.id === currentUser.id) return false;
    
    // Super admin can delete anyone
    if (currentUser.role === "super_admin") return true;
    
    // Company admin can delete managers and employees in their company
    if (currentUser.role === "company_admin") {
      return (
        user.companyId === currentUser.companyId &&
        (user.role === "manager" || user.role === "employee")
      );
    }
    
    return false;
  };

  const handleEditUser = (userData: any) => {
    updateUserMutation.mutate({
      id: userToEdit.id,
      ...userData,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No users found.
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                      <AvatarFallback>
                        {getUserInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      user.role === "super_admin" ? "destructive" :
                      user.role === "company_admin" ? "default" :
                      user.role === "manager" ? "secondary" : "outline"
                    }
                  >
                    {formatRole(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getCompanyName(user.companyId)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className={canEditUser(user) ? "" : "text-gray-400 cursor-not-allowed"}
                        onClick={() => canEditUser(user) && setUserToEdit(user)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={canDeleteUser(user) ? "text-red-600 hover:text-red-700" : "text-gray-400 cursor-not-allowed"}
                        onClick={() => canDeleteUser(user) && onDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit User Modal */}
      {userToEdit && (
        <UserForm
          open={!!userToEdit}
          onClose={() => setUserToEdit(null)}
          onSubmit={handleEditUser}
          isSubmitting={updateUserMutation.isPending}
          companies={companies}
          currentUserRole={currentUser?.role || ''}
          currentCompanyId={currentUser?.companyId || null}
          user={userToEdit}
        />
      )}
    </div>
  );
}

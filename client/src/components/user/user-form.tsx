import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/pages/user-management";

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  companies: any[];
  currentUserRole: string;
  currentCompanyId: number | null;
  user?: any; // For editing existing user
}

// Validation schema
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(["super_admin", "company_admin", "manager", "employee"]),
  companyId: z.number().nullable().optional(),
  managerId: z.number().nullable().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserForm({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  companies,
  currentUserRole,
  currentCompanyId,
  user,
}: UserFormProps) {
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "employee");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    user?.companyId || currentCompanyId
  );

  // Fetch managers for the selected company
  const { data: managers = [], refetch: refetchManagers } = useQuery({
    queryKey: ['/api/users', selectedCompanyId, 'managers'],
    queryFn: async () => {
      // In a real implementation, this would be an API call to get managers
      // For simplicity, we're just filtering from all users
      return allUsers.filter((u: User) => 
        u.companyId === selectedCompanyId && u.role === 'manager'
      );
    },
    enabled: !!selectedCompanyId && selectedRole === 'employee',
  });

  // Fetch all users to get available managers
  const { data: allUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!selectedCompanyId && selectedRole === 'employee',
  });

  useEffect(() => {
    if (selectedCompanyId && selectedRole === 'employee') {
      refetchManagers();
    }
  }, [selectedCompanyId, selectedRole, refetchManagers]);

  // Determine available roles based on current user's role
  const getAvailableRoles = () => {
    switch (currentUserRole) {
      case "super_admin":
        return ["super_admin", "company_admin", "manager", "employee"];
      case "company_admin":
        return ["manager", "employee"];
      default:
        return ["employee"];
    }
  };

  // Only show company selection for super admin creating company admins
  const showCompanySelection = () => {
    return currentUserRole === "super_admin";
  };

  const availableRoles = getAvailableRoles();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: user?.username || "",
      password: "",
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      role: user?.role || "employee",
      companyId: user?.companyId || currentCompanyId || null,
      managerId: user?.managerId || null,
    },
    mode: "onChange"
  });
  
  // Log form submission for debugging
  const handleSubmit = (data: UserFormValues) => {
    console.log("User form submitted with data:", data);
    
    // Ensure companyId is a number
    if (data.companyId && typeof data.companyId === 'string') {
      data.companyId = parseInt(data.companyId);
    }
    
    // Ensure managerId is a number
    if (data.managerId && typeof data.managerId === 'string') {
      data.managerId = parseInt(data.managerId);
    }
    
    // Call the parent's onSubmit function
    onSubmit(data);
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    form.setValue("role", role as any);
    
    // Clear manager ID if role is not employee
    if (role !== "employee") {
      form.setValue("managerId", null);
    }
  };

  const handleCompanyChange = (companyId: number) => {
    setSelectedCompanyId(companyId);
    form.setValue("companyId", companyId);
    // Reset manager when company changes
    form.setValue("managerId", null);
  };

  // Filter out companies with invalid IDs
  const validCompanies = companies.filter(
    (company) => company.id != null && company.id !== "" && company.id !== 0
  );

  // Filter out managers with invalid IDs
  const validManagers = managers.filter(
    (manager: any) => manager.id != null && manager.id !== "" && manager.id !== 0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">
            {user ? "Edit User" : "Add New User"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {user ? "Update user information below" : "Fill in the details to create a new user account"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Personal Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Password and Role Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {!user && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter password" className="h-9" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Role</FormLabel>
                    <Select
                      onValueChange={handleRoleChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role === "super_admin"
                              ? "Super Admin"
                              : role === "company_admin"
                              ? "Company Admin"
                              : role === "manager"
                              ? "Manager"
                              : "Employee"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              {showCompanySelection() && (selectedRole === "company_admin" || selectedRole === "manager" || selectedRole === "employee") && (
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Company</FormLabel>
                      <Select
                        onValueChange={(value) => handleCompanyChange(Number(value))}
                        defaultValue={field.value?.toString() || ""}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {validCompanies.map((company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Manager Selection */}
            {selectedRole === "employee" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="managerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Manager (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                        defaultValue={field.value?.toString() || "none"}
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Manager</SelectItem>
                          {validManagers.map((manager: any) => (
                            <SelectItem key={manager.id} value={manager.id.toString()}>
                              {manager.firstName} {manager.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {/* Action Buttons */}
            <DialogFooter className="pt-6 border-t">
              <div className="flex gap-3 w-full justify-end">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={onClose}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    user ? "Update User" : "Create User"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
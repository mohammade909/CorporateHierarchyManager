import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScheduleMeetingProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  availableUsers: any[];
  currentUserRole: string;
  currentCompanyId: number | null;
}

// Validation schema
const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  startTime: z.string({
    required_error: "Start time is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  endTime: z.string({
    required_error: "End time is required",
  }),
  companyId: z.number().optional(),
  participants: z.array(z.number()).optional(),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

export default function ScheduleMeeting({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  availableUsers,
  currentUserRole,
  currentCompanyId,
}: ScheduleMeetingProps) {
  const { user } = useAuth();
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Fetch companies for super admin
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies'],
    enabled: currentUserRole === 'super_admin',
  });

  // Filter users by company
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(currentCompanyId);

  const filteredUsers = availableUsers.filter((u) => {
    if (!selectedCompanyId) return true;
    return u.companyId === selectedCompanyId;
  });

  // Default form values
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: now,
      startTime: format(now, "HH:mm"),
      endDate: oneHourLater,
      endTime: format(oneHourLater, "HH:mm"),
      companyId: currentCompanyId || undefined,
      participants: [],
    },
  });

  const handleSelectUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleFormSubmit = (data: MeetingFormValues) => {
    // Combine date and time into full timestamps
    const startDateTime = new Date(data.startDate);
    const [startHours, startMinutes] = data.startTime.split(":").map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);
    
    const endDateTime = new Date(data.endDate);
    const [endHours, endMinutes] = data.endTime.split(":").map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);
    
    // Validate that end time is after start time
    if (endDateTime <= startDateTime) {
      form.setError("endTime", {
        type: "manual",
        message: "End time must be after start time",
      });
      return;
    }
    
    // Format the data for submission
    const meetingData = {
      title: data.title,
      description: data.description || "",
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      companyId: data.companyId || currentCompanyId,
      participants: selectedUserIds,
    };
    
    onSubmit(meetingData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Schedule a Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting and invite participants.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter meeting title" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter meeting description"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {currentUserRole === "super_admin" && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const companyId = parseInt(value);
                        field.onChange(companyId);
                        setSelectedCompanyId(companyId);
                      }}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company: any) => (
                          <SelectItem
                            key={company.id}
                            value={company.id.toString()}
                          >
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <div className="flex items-center">
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <Clock className="ml-2 h-4 w-4 text-gray-400" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <div className="flex items-center">
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                        />
                      </FormControl>
                      <Clock className="ml-2 h-4 w-4 text-gray-400" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div>
              <FormLabel>Participants</FormLabel>
              {selectedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1 my-2">
                  {selectedUserIds.map((id) => {
                    const user = filteredUsers.find((u) => u.id === id);
                    return (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {user ? `${user.firstName} ${user.lastName}` : `User ${id}`}
                        <button
                          type="button"
                          className="ml-1 text-xs"
                          onClick={() => handleSelectUser(id)}
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button" className="w-full mt-1">
                    Select Participants
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No users found</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-[200px]">
                          {filteredUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              onSelect={() => handleSelectUser(user.id)}
                              className="flex items-center gap-2"
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  selectedUserIds.includes(user.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                              <span>
                                {user.firstName} {user.lastName}
                              </span>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {user.role}
                              </span>
                            </CommandItem>
                          ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

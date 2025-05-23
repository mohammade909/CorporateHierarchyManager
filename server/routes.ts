import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { 
  authenticateJwt, 
  authorize, 
  generateToken, 
  hashPassword, 
  comparePassword,
  loginSchema,
  registerSchema
} from "./auth";
import { 
  insertCompanySchema, 
  insertUserSchema, 
  insertMessageSchema, 
  insertMeetingSchema 
} from "@shared/schema";
import axios from "axios";

// Type for WebSocket clients with user information
interface WebSocketClient extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

// Message types for WebSocket communication
type WebSocketMessage = {
  type: "text" | "voice" | "status" | "ping";
  senderId?: number;
  receiverId?: number;
  content?: string;
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<number, WebSocketClient>();
  
  // Setup WebSocket heartbeat mechanism to detect disconnected clients
  function heartbeat(this: WebSocketClient) {
    this.isAlive = true;
  }

  // User Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      // Generate JWT token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
      
      res.status(201).json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          managerId: user.managerId,
        }, 
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by username
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(validatedData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate JWT token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
      
      res.json({ 
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
          managerId: user.managerId,
        }, 
        token 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // User CRUD
  app.get("/api/users", authenticateJwt, authorize(['super_admin', 'company_admin', 'employee']), async (req, res) => {
    try {
      let users;
      
      const { role, companyId } = req.user!;
      
      if (role === 'super_admin') {
        // Super admin can see all users but might want to filter by company
        const filterCompanyId = req.query.companyId ? Number(req.query.companyId) : undefined;
        
        if (filterCompanyId) {
          users = await storage.getUsersByCompany(filterCompanyId);
        } else {
          // For super admin, we'll need a method to get all users, this is a simplified approach
          const companies = await storage.getCompanies();
          users = [];
          
          for (const company of companies) {
            const companyUsers = await storage.getUsersByCompany(company.id);
            users.push(...companyUsers);
          }
        }
      } else if (role === 'company_admin' && companyId) {
        // Company admin can only see users in their company
        users = await storage.getUsersByCompany(companyId);
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Remove password from response
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", authenticateJwt, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check authorization based on role
      const { role, userId: currentUserId, companyId: currentCompanyId } = req.user!;
      
      // Super admin can access any user
      if (role === 'super_admin') {
        // Allow access
      } 
      // Company admin can access users in their company
      else if (role === 'company_admin' && currentCompanyId === user.companyId) {
        // Allow access
      }
      // Manager can access their managed employees
      else if (role === 'manager' && user.managerId === currentUserId) {
        // Allow access
      }
      // Users can access their own data
      else if (currentUserId === userId) {
        // Allow access
      }
      else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", authenticateJwt, authorize(['super_admin', 'company_admin']), async (req, res) => {
    try {
      // Validate input
      const validatedData = insertUserSchema.parse(req.body);
      
      // Add authorization logic
      const { role, companyId: adminCompanyId } = req.user!;
      
      // If company admin, enforce company id
      if (role === 'company_admin') {
        if (validatedData.companyId !== adminCompanyId) {
          return res.status(403).json({ 
            message: "Company admin can only add users to their own company" 
          });
        }
        
        // Company admins can only create managers or employees
        if (!['manager', 'employee'].includes(validatedData.role)) {
          return res.status(403).json({ 
            message: "Company admin can only create manager or employee accounts" 
          });
        }
      }
      
      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", authenticateJwt, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get the user to update
      const userToUpdate = await storage.getUser(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Authorization check
      const { role, userId: currentUserId, companyId: currentCompanyId } = req.user!;
      
      // Users can update their own non-role related data
      if (currentUserId === userId) {
        // Allow self updates but prevent role change
        if (req.body.role && req.body.role !== userToUpdate.role) {
          return res.status(403).json({ message: "Cannot change your own role" });
        }
      } 
      // Super admin can update any user
      else if (role === 'super_admin') {
        // Allow all updates
      }
      // Company admin can update managers and employees in their company
      else if (role === 'company_admin' && 
              currentCompanyId === userToUpdate.companyId && 
              ['manager', 'employee'].includes(userToUpdate.role)) {
        
        // Prevent company admin from changing user's company
        if (req.body.companyId && req.body.companyId !== currentCompanyId) {
          return res.status(403).json({ 
            message: "Cannot transfer user to another company" 
          });
        }
        
        // Prevent changing to a role higher than their own
        if (req.body.role && !['manager', 'employee'].includes(req.body.role)) {
          return res.status(403).json({ 
            message: "Cannot promote to a role higher than your own" 
          });
        }
      }
      // Manager can update their managed employees
      else if (role === 'manager' && 
              userToUpdate.managerId === currentUserId && 
              userToUpdate.role === 'employee') {
        // Prevent managers from changing employee's role or company
        if (req.body.role || req.body.companyId) {
          return res.status(403).json({ 
            message: "Managers cannot change employee role or company" 
          });
        }
      }
      else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Handle password update separately if provided
      let updatedFields: any = { ...req.body };
      
      if (updatedFields.password) {
        updatedFields.password = await hashPassword(updatedFields.password);
      }
      
      const updatedUser = await storage.updateUser(userId, updatedFields);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateJwt, authorize(['super_admin', 'company_admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get the user to delete
      const userToDelete = await storage.getUser(userId);
      
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Authorization check
      const { role, userId: currentUserId, companyId: currentCompanyId } = req.user!;
      
      // Prevent self-deletion
      if (currentUserId === userId) {
        return res.status(403).json({ message: "Cannot delete yourself" });
      }
      
      // Company admin can only delete managers and employees in their company
      if (role === 'company_admin') {
        if (userToDelete.companyId !== currentCompanyId) {
          return res.status(403).json({ message: "Cannot delete users from other companies" });
        }
        
        if (!['manager', 'employee'].includes(userToDelete.role)) {
          return res.status(403).json({ message: "Cannot delete users with higher roles" });
        }
      }
      
      await storage.deleteUser(userId);
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Company Routes
  app.get("/api/companies", authenticateJwt, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", authenticateJwt, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", authenticateJwt, authorize(['super_admin']), async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(validatedData);
      
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", authenticateJwt, async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      // Get company to update
      const companyToUpdate = await storage.getCompany(companyId);
      
      if (!companyToUpdate) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Check authorization
      const { role, companyId: userCompanyId } = req.user!;
      
      if (role !== 'super_admin' && 
          (role !== 'company_admin' || userCompanyId !== companyId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertCompanySchema.partial().parse(req.body);
      const updatedCompany = await storage.updateCompany(companyId, validatedData);
      
      if (!updatedCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(updatedCompany);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", authenticateJwt, authorize(['super_admin']), async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      
      // Check if company exists
      const companyToDelete = await storage.getCompany(companyId);
      
      if (!companyToDelete) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      await storage.deleteCompany(companyId);
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Message Routes
  app.get("/api/messages", authenticateJwt, async (req, res) => {
    try {
      const { userId } = req.user!;
      
      const messages = await storage.getUserMessages(userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/conversation/:userId", authenticateJwt, async (req, res) => {
    try {
      const currentUserId = req.user!.userId;
      const otherUserId = parseInt(req.params.userId);
      
      // Check if communication is allowed between these users
      const currentUser = await storage.getUser(currentUserId);
      const otherUser = await storage.getUser(otherUserId);
      
      if (!currentUser || !otherUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check communication permissions based on roles
      const canCommunicate = await checkCommunicationPermission(currentUser, otherUser);
      
      if (!canCommunicate) {
        return res.status(403).json({ 
          message: "You don't have permission to communicate with this user" 
        });
      }
      
      const messages = await storage.getMessagesBetweenUsers(currentUserId, otherUserId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages", authenticateJwt, async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.userId,
      });
      
      // Check if communication is allowed between these users
      const sender = await storage.getUser(validatedData.senderId);
      const receiver = await storage.getUser(validatedData.receiverId);
      
      if (!sender || !receiver) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check communication permissions based on roles
      const canCommunicate = await checkCommunicationPermission(sender, receiver);
      
      if (!canCommunicate) {
        return res.status(403).json({ 
          message: "You don't have permission to communicate with this user" 
        });
      }
      
      const message = await storage.createMessage(validatedData);
      
      // Broadcast message via WebSocket if receiver is connected
      const receiverWs = clients.get(validatedData.receiverId);
      if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
        receiverWs.send(JSON.stringify({
          type: validatedData.type,
          message: message,
          senderId: validatedData.senderId,
          receiverId: validatedData.receiverId,
        }));
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.put("/api/messages/:id/read", authenticateJwt, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const { userId } = req.user!;
      
      const message = await storage.getMessage(messageId);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only the receiver can mark a message as read
      if (message.receiverId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      await storage.markMessageAsRead(messageId);
      
      res.status(204).end();
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Meeting Routes
  app.get("/api/meetings", authenticateJwt, async (req, res) => {
    try {
      const { userId, role, companyId } = req.user!;
      
      let meetings;
      
      if (role === 'super_admin') {
        // Super admin can filter by company or see all
        const filterCompanyId = req.query.companyId ? Number(req.query.companyId) : undefined;
        
        if (filterCompanyId) {
          meetings = await storage.getMeetingsByCompany(filterCompanyId);
        } else {
          // Get all meetings from all companies
          const companies = await storage.getCompanies();
          meetings = [];
          
          for (const company of companies) {
            const companyMeetings = await storage.getMeetingsByCompany(company.id);
            meetings.push(...companyMeetings);
          }
        }
      } else if (role === 'company_admin' && companyId) {
        // Company admin sees all meetings in their company
        meetings = await storage.getMeetingsByCompany(companyId);
      } else {
        // Managers and employees see only meetings they're a part of
        meetings = await storage.getMeetingsByUser(userId);
      }
      
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  app.get("/api/meetings/:id", authenticateJwt, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { userId, role, companyId } = req.user!;
      
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check authorization
      if (role === 'super_admin') {
        // Super admin can view any meeting
      } else if (role === 'company_admin' && meeting.companyId === companyId) {
        // Company admin can view meetings in their company
      } else {
        // For managers and employees, check if they're the organizer or participant
        const participants = await storage.getMeetingParticipants(meetingId);
        const isParticipant = participants.some(p => p.id === userId);
        
        if (meeting.organizerId !== userId && !isParticipant) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }
      
      const participants = await storage.getMeetingParticipants(meetingId);
      
      res.json({
        ...meeting,
        participants: participants.map(p => ({
          id: p.id,
          username: p.username,
          firstName: p.firstName,
          lastName: p.lastName,
          role: p.role,
        })),
      });
    } catch (error) {
      console.error("Error fetching meeting:", error);
      res.status(500).json({ message: "Failed to fetch meeting" });
    }
  });

  app.post("/api/meetings", authenticateJwt, async (req, res) => {
    try {
      console.log(req.body)
      const validatedData = insertMeetingSchema.parse({
        ...req.body,
        organizerId: req.user!.userId,
      });
      
      const { role, companyId, userId } = req.user!;
      
      // Ensure the meeting is created for the user's company
      if (role !== 'super_admin' && validatedData.companyId !== companyId) {
        return res.status(403).json({ 
          message: "You can only create meetings for your company" 
        });
      }
      
      // If Zoom integration is enabled, create Zoom meeting
      if (process.env.ZOOM_API_KEY && process.env.ZOOM_API_SECRET) {
        try {
          const zoomMeeting = await createZoomMeeting(validatedData);
          
          if (zoomMeeting) {
            validatedData.zoomMeetingId = zoomMeeting.id;
            validatedData.zoomPassword = zoomMeeting.password;
            validatedData.zoomJoinUrl = zoomMeeting.join_url;
          }
        } catch (zoomError) {
          console.error("Error creating Zoom meeting:", zoomError);
          // Continue without Zoom integration if it fails
        }
      }
      
      const meeting = await storage.createMeeting(validatedData);
      
      // Add participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        for (const participantId of req.body.participants) {
          await storage.addMeetingParticipant({
            meetingId: meeting.id,
            userId: participantId,
            attended: false,
          });
          
          // Notify participant via WebSocket if connected
          const participantWs = clients.get(participantId);
          if (participantWs && participantWs.readyState === WebSocket.OPEN) {
            participantWs.send(JSON.stringify({
              type: "meeting_invite",
              meetingId: meeting.id,
              title: meeting.title,
              startTime: meeting.startTime,
            }));
          }
        }
      }
      
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error creating meeting:", error);
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  app.put("/api/meetings/:id", authenticateJwt, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { role, companyId, userId } = req.user!;
      
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check authorization
      if (role === 'super_admin') {
        // Super admin can update any meeting
      } else if (role === 'company_admin' && meeting.companyId === companyId) {
        // Company admin can update meetings in their company
      } else if (meeting.organizerId === userId) {
        // Organizer can update their own meeting
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const validatedData = insertMeetingSchema.partial().parse(req.body);
      
      // Update Zoom meeting if needed
      if (meeting.zoomMeetingId && 
          (validatedData.title || validatedData.description || 
           validatedData.startTime || validatedData.endTime)) {
        try {
          await updateZoomMeeting(meeting.zoomMeetingId, {
            ...meeting,
            ...validatedData,
          });
        } catch (zoomError) {
          console.error("Error updating Zoom meeting:", zoomError);
          // Continue even if Zoom update fails
        }
      }
      
      const updatedMeeting = await storage.updateMeeting(meetingId, validatedData);
      
      if (!updatedMeeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Update participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        // Get current participants
        const currentParticipants = await storage.getMeetingParticipants(meetingId);
        const currentParticipantIds = currentParticipants.map(p => p.id);
        
        // Add new participants
        for (const participantId of req.body.participants) {
          if (!currentParticipantIds.includes(participantId)) {
            await storage.addMeetingParticipant({
              meetingId,
              userId: participantId,
              attended: false,
            });
            
            // Notify new participant
            const participantWs = clients.get(participantId);
            if (participantWs && participantWs.readyState === WebSocket.OPEN) {
              participantWs.send(JSON.stringify({
                type: "meeting_update",
                meetingId,
                action: "added",
                title: updatedMeeting.title,
                startTime: updatedMeeting.startTime,
              }));
            }
          }
        }
        
        // Remove participants not in the new list
        for (const participant of currentParticipants) {
          if (!req.body.participants.includes(participant.id)) {
            await storage.removeMeetingParticipant(meetingId, participant.id);
            
            // Notify removed participant
            const participantWs = clients.get(participant.id);
            if (participantWs && participantWs.readyState === WebSocket.OPEN) {
              participantWs.send(JSON.stringify({
                type: "meeting_update",
                meetingId,
                action: "removed",
                title: updatedMeeting.title,
              }));
            }
          }
        }
      }
      
      res.json(updatedMeeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      console.error("Error updating meeting:", error);
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  app.delete("/api/meetings/:id", authenticateJwt, async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      const { role, companyId, userId } = req.user!;
      
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      // Check authorization
      if (role === 'super_admin') {
        // Super admin can delete any meeting
      } else if (role === 'company_admin' && meeting.companyId === companyId) {
        // Company admin can delete meetings in their company
      } else if (meeting.organizerId === userId) {
        // Organizer can delete their own meeting
      } else {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Delete Zoom meeting if exists
      if (meeting.zoomMeetingId) {
        try {
          await deleteZoomMeeting(meeting.zoomMeetingId);
        } catch (zoomError) {
          console.error("Error deleting Zoom meeting:", zoomError);
          // Continue even if Zoom deletion fails
        }
      }
      
      // Get participants for notification
      const participants = await storage.getMeetingParticipants(meetingId);
      
      await storage.deleteMeeting(meetingId);
      
      // Notify participants
      for (const participant of participants) {
        const participantWs = clients.get(participant.id);
        if (participantWs && participantWs.readyState === WebSocket.OPEN) {
          participantWs.send(JSON.stringify({
            type: "meeting_update",
            meetingId,
            action: "cancelled",
            title: meeting.title,
          }));
        }
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  // WebSocket server setup for real-time messaging
  wss.on('connection', (ws: WebSocketClient) => {
    ws.isAlive = true;
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message) as WebSocketMessage;
        
        // Handle authentication message
        if (data.type === 'status' && data.senderId) {
          ws.userId = data.senderId;
          clients.set(data.senderId, ws);
          console.log(`User ${data.senderId} connected via WebSocket`);
          
          // Send confirmation
          ws.send(JSON.stringify({ type: 'status', content: 'connected' }));
          return;
        }
        
        // Handle ping message
        if (data.type === 'ping') {
          ws.isAlive = true;
          ws.send(JSON.stringify({ type: 'ping' }));
          return;
        }
        
        // Handle actual messages
        if ((data.type === 'text' || data.type === 'voice') && 
            data.senderId && data.receiverId && data.content) {
          // Store message in database
          const sender = await storage.getUser(data.senderId);
          const receiver = await storage.getUser(data.receiverId);
          
          if (!sender || !receiver) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              content: 'Sender or receiver not found' 
            }));
            return;
          }
          
          // Check communication permissions
          const canCommunicate = await checkCommunicationPermission(sender, receiver);
          
          if (!canCommunicate) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              content: 'Communication not allowed between these users' 
            }));
            return;
          }
          
          // Save message
          const message = await storage.createMessage({
            senderId: data.senderId,
            receiverId: data.receiverId,
            type: data.type,
            content: data.content,
            isRead: false,
          });
          
          // Forward to receiver if online
          const receiverWs = clients.get(data.receiverId);
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify({
              type: data.type,
              senderId: data.senderId,
              content: data.content,
              messageId: message.id,
              timestamp: message.createdAt,
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          content: 'Failed to process message' 
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (ws.userId) {
        console.log(`User ${ws.userId} disconnected from WebSocket`);
        clients.delete(ws.userId);
      }
    });
    
    // Set ping-pong for connection health check
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });
  
  // Setup interval to check for dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocketClient) => {
      if (!ws.isAlive) {
        if (ws.userId) {
          clients.delete(ws.userId);
        }
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  // Clear interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  return httpServer;
}

// Helper functions
async function checkCommunicationPermission(sender: any, receiver: any): Promise<boolean> {
  // Super admin can communicate with anyone
  if (sender.role === 'super_admin') {
    return true;
  }
  
  // Users from different companies can't communicate
  if (sender.companyId !== receiver.companyId) {
    return false;
  }
  
  // Company admin can communicate with any user in their company
  if (sender.role === 'company_admin') {
    return true;
  }
  
  // Manager can communicate with their assigned employees and company admin
  if (sender.role === 'manager') {
    if (receiver.role === 'company_admin') {
      return true;
    }
    
    if (receiver.role === 'employee' && receiver.managerId === sender.id) {
      return true;
    }
    
    return false;
  }
  
  // Employee can communicate with their assigned manager and company admin
  if (sender.role === 'employee') {
    if (receiver.role === 'company_admin') {
      return true;
    }
    
    if (receiver.role === 'manager' && sender.managerId === receiver.id) {
      return true;
    }
    
    return false;
  }
  
  return false;
}

// Zoom integration helpers (simplified)
async function createZoomMeeting(meetingData: any) {
  // Implementation would use Zoom SDK or API
  // This is a placeholder that would be replaced with actual Zoom API integration
  console.log("Creating Zoom meeting:", meetingData.title);
  
  // In a real implementation, you would call Zoom API here
  return {
    id: "mock_zoom_id_" + Date.now(),
    password: "password123",
    join_url: `https://zoom.us/j/mock_meeting_${Date.now()}`,
  };
}

async function updateZoomMeeting(zoomMeetingId: string, meetingData: any) {
  // Implementation would use Zoom SDK or API
  console.log("Updating Zoom meeting:", zoomMeetingId);
  
  // In a real implementation, you would call Zoom API here
  return true;
}

async function deleteZoomMeeting(zoomMeetingId: string) {
  // Implementation would use Zoom SDK or API
  console.log("Deleting Zoom meeting:", zoomMeetingId);
  
  // In a real implementation, you would call Zoom API here
  return true;
}

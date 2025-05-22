import { 
  users, companies, messages, meetings, meetingParticipants,
  type User, type InsertUser, type Company, type InsertCompany,
  type Message, type InsertMessage, type Meeting, type InsertMeeting,
  type MeetingParticipant, type InsertMeetingParticipant
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<Omit<InsertUser, "password">>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsersByCompany(companyId: number): Promise<User[]>;
  getUsersByManager(managerId: number): Promise<User[]>;
  
  // Company methods
  getCompany(id: number): Promise<Company | undefined>;
  getCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  getUserMessages(userId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;
  deleteMessage(id: number): Promise<boolean>;
  
  // Meeting methods
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByCompany(companyId: number): Promise<Meeting[]>;
  getMeetingsByUser(userId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meetingData: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;
  
  // Meeting participants methods
  addMeetingParticipant(participant: InsertMeetingParticipant): Promise<MeetingParticipant>;
  removeMeetingParticipant(meetingId: number, userId: number): Promise<boolean>;
  getMeetingParticipants(meetingId: number): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<Omit<InsertUser, "password">>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getUsersByCompany(companyId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getUsersByManager(managerId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.managerId, managerId));
  }

  // Company methods
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(insertCompany).returning();
    return company;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updatedCompany] = await db
      .update(companies)
      .set(companyData)
      .where(eq(companies.id, id))
      .returning();
    return updatedCompany;
  }

  async deleteCompany(id: number): Promise<boolean> {
    await db.delete(companies).where(eq(companies.id, id));
    return true;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, user1Id),
            eq(messages.receiverId, user2Id)
          ),
          and(
            eq(messages.senderId, user2Id),
            eq(messages.receiverId, user1Id)
          )
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
    return true;
  }

  async deleteMessage(id: number): Promise<boolean> {
    await db.delete(messages).where(eq(messages.id, id));
    return true;
  }

  // Meeting methods
  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting;
  }

  async getMeetingsByCompany(companyId: number): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.companyId, companyId))
      .orderBy(asc(meetings.startTime));
  }

  async getMeetingsByUser(userId: number): Promise<Meeting[]> {
    // Get meetings where user is organizer or participant
    const participatedMeetingIds = await db
      .select({ id: meetingParticipants.meetingId })
      .from(meetingParticipants)
      .where(eq(meetingParticipants.userId, userId));
    
    const participatedIds = participatedMeetingIds.map(m => m.id);
    
    return await db
      .select()
      .from(meetings)
      .where(
        or(
          eq(meetings.organizerId, userId),
          participatedIds.length > 0 
            ? inArray(meetings.id, participatedIds) 
            : sql`false`
        )
      )
      .orderBy(asc(meetings.startTime));
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(insertMeeting).returning();
    return meeting;
  }

  async updateMeeting(id: number, meetingData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updatedMeeting] = await db
      .update(meetings)
      .set(meetingData)
      .where(eq(meetings.id, id))
      .returning();
    return updatedMeeting;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    await db.delete(meetings).where(eq(meetings.id, id));
    return true;
  }

  // Meeting participants methods
  async addMeetingParticipant(participant: InsertMeetingParticipant): Promise<MeetingParticipant> {
    const [result] = await db
      .insert(meetingParticipants)
      .values(participant)
      .returning();
    return result;
  }

  async removeMeetingParticipant(meetingId: number, userId: number): Promise<boolean> {
    await db
      .delete(meetingParticipants)
      .where(
        and(
          eq(meetingParticipants.meetingId, meetingId),
          eq(meetingParticipants.userId, userId)
        )
      );
    return true;
  }

  async getMeetingParticipants(meetingId: number): Promise<User[]> {
    const participantRecords = await db
      .select({ userId: meetingParticipants.userId })
      .from(meetingParticipants)
      .where(eq(meetingParticipants.meetingId, meetingId));
    
    const userIds = participantRecords.map(p => p.userId);
    
    if (userIds.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(users)
      .where(inArray(users.id, userIds));
  }
}

export const storage = new DatabaseStorage();

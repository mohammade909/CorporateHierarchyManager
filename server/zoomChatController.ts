// zoomChatController.ts
import { Request, Response } from 'express';
import { ZoomTeamChatService } from './zoomTeamChatService';

export class ZoomChatController {
  private zoomChatService: ZoomTeamChatService;

  constructor() {
    this.zoomChatService = new ZoomTeamChatService(
      'eFwvmyl2TcSKNM1iyMTlng',
      "FYldVq4AcTDt9IclIp9eEkuTUc1IPff6",
       "OZWhroVYT0adDjOQOUAZSA"
    );
  }

  // GET /api/chat/channels - Get all channels
  async getChannels(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;
      const channels = await this.zoomChatService.getChannels(userId as string);
      res.json({ success: true, data: channels });
    } catch (error) {
      console.error('Error getting channels:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get channels' 
      });
    }
  }

  // POST /api/chat/channels - Create a new channel
  async createChannel(req: Request, res: Response): Promise<void> {
    try {
      const { name, type = 3, members } = req.body;
      
      if (!name) {
        res.status(400).json({ success: false, error: 'Channel name is required' });
        return;
      }

      const channel = await this.zoomChatService.createChannel(name, type, members);
      res.status(201).json({ success: true, data: channel });
    } catch (error) {
      console.error('Error creating channel:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create channel' 
      });
    }
  }

  // POST /api/chat/messages - Send a message
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const messageData = req.body;
      
      if (!messageData.message) {
        res.status(400).json({ success: false, error: 'Message content is required' });
        return;
      }

      if (!messageData.to_jid && !messageData.to_contact && !messageData.to_channel) {
        res.status(400).json({ 
          success: false, 
          error: 'Message destination (to_jid, to_contact, or to_channel) is required' 
        });
        return;
      }

      const result = await this.zoomChatService.sendMessage(messageData);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }
  }

  // GET /api/chat/messages - Get messages
  async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const {
        to_jid,
        to_contact,
        to_channel,
        from_date,
        to_date,
        page_size = 30,
        next_page_token
      } = req.query;

      const result = await this.zoomChatService.getMessages(
        to_jid as string,
        to_contact as string,
        to_channel as string,
        from_date as string,
        to_date as string,
        parseInt(page_size as string, 10),
        next_page_token as string
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get messages' 
      });
    }
  }

  // GET /api/chat/channels/:channelId/members - Get channel members
  async getChannelMembers(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const members = await this.zoomChatService.getChannelMembers(channelId);
      res.json({ success: true, data: members });
    } catch (error) {
      console.error('Error getting channel members:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get channel members' 
      });
    }
  }

  // POST /api/chat/channels/:channelId/members - Add members to channel
  async addChannelMembers(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const { members } = req.body;

      if (!members || !Array.isArray(members)) {
        res.status(400).json({ success: false, error: 'Members array is required' });
        return;
      }

      await this.zoomChatService.addChannelMembers(channelId, members);
      res.json({ success: true, message: 'Members added successfully' });
    } catch (error) {
      console.error('Error adding channel members:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add channel members' 
      });
    }
  }

  // DELETE /api/chat/channels/:channelId/members/:memberId - Remove member from channel
  async removeChannelMember(req: Request, res: Response): Promise<void> {
    try {
      const { channelId, memberId } = req.params;
      await this.zoomChatService.removeChannelMember(channelId, memberId);
      res.json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      console.error('Error removing channel member:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove channel member' 
      });
    }
  }

  // PATCH /api/chat/channels/:channelId - Update channel
  async updateChannel(req: Request, res: Response): Promise<void> {
    try {
      const { channelId } = req.params;
      const updates = req.body;
      
      await this.zoomChatService.updateChannel(channelId, updates);
      res.json({ success: true, message: 'Channel updated successfully' });
    } catch (error) {
      console.error('Error updating channel:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update channel' 
      });
    }
  }

  // DELETE /api/chat/messages/:messageId - Delete a message
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { to_jid, to_contact, to_channel } = req.query;

      await this.zoomChatService.deleteMessage(
        messageId,
        to_jid as string,
        to_contact as string,
        to_channel as string
      );
      
      res.json({ success: true, message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete message' 
      });
    }
  }

  // PATCH /api/chat/messages/:messageId - Update a message
  async updateMessage(req: Request, res: Response): Promise<void> {
    try {
      const { messageId } = req.params;
      const { message, to_jid, to_contact, to_channel } = req.body;

      if (!message) {
        res.status(400).json({ success: false, error: 'Message content is required' });
        return;
      }

      await this.zoomChatService.updateMessage(messageId, message, to_jid, to_contact, to_channel);
      res.json({ success: true, message: 'Message updated successfully' });
    } catch (error) {
      console.error('Error updating message:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update message' 
      });
    }
  }

  // POST /api/chat/upload - Upload file
  async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      // Assuming you're using multer or similar for file uploads
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const { to_jid, to_contact, to_channel } = req.body;
      
      const result = await this.zoomChatService.uploadFile(
        req.file.path,
        req.file.originalname,
        to_jid,
        to_contact,
        to_channel
      );

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload file' 
      });
    }
  }
}
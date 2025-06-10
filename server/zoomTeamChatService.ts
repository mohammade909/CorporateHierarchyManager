// zoomTeamChatService.ts
import axios, { AxiosResponse } from 'axios';

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ChatChannel {
  id: string;
  name: string;
  type: number; // 1=IM, 2=Private Group, 3=Public Channel, 4=Cross Organization
  jid?: string;
}

interface ChatMessage {
  id: string;
  message: string;
  sender: string;
  date_time: string;
  timestamp: number;
  to_jid: string;
  to_contact?: string;
  to_channel?: string;
}

interface SendMessageRequest {
  message: string;
  to_jid?: string;
  to_contact?: string;
  to_channel?: string;
  reply_main_message_id?: string;
  at_items?: Array<{
    at_contact?: string;
    at_type?: number; // 1=@contact, 2=@all
    start_position?: number;
    end_position?: number;
  }>;
}

interface ChatMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
}

export class ZoomTeamChatService {
  private baseUrl: string = 'https://api.zoom.us/v2';
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;

  constructor(clientId: string, clientSecret: string, accountId: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accountId = accountId;
  }

  // Get OAuth token for Server-to-Server app
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response: AxiosResponse<ZoomTokenResponse> = await axios.post(
        'https://zoom.us/oauth/token',
        new URLSearchParams({
          grant_type: 'account_credentials',
          account_id: this.accountId,
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiryTime = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute early

      return this.accessToken;
    } catch (error) {
      console.error('Error getting Zoom access token:', error);
      throw new Error('Failed to obtain Zoom access token');
    }
  }

  // Get list of channels
  async getChannels(userId?: string): Promise<ChatChannel[]> {
    try {
      const token = await this.getAccessToken();
      const endpoint = userId ? `/chat/users/${userId}/channels` : '/chat/channels';
      
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.channels || [];
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw new Error('Failed to fetch channels');
    }
  }

  // Create a new channel
  async createChannel(name: string, type: number = 3, members?: string[]): Promise<ChatChannel> {
    try {
      const token = await this.getAccessToken();
      
      const channelData = {
        name,
        type, // 1=IM, 2=Private Group, 3=Public Channel, 4=Cross Organization
        members: members || []
      };

      const response = await axios.post(
        `${this.baseUrl}/chat/channels`,
        channelData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw new Error('Failed to create channel');
    }
  }

  // Send a message to a channel or user
  async sendMessage(messageData: SendMessageRequest): Promise<ChatMessage> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/chat/users/me/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  // Get messages from a channel or conversation
  async getMessages(
    toJid?: string,
    toContact?: string,
    toChannel?: string,
    fromDate?: string,
    toDate?: string,
    pageSize: number = 30,
    nextPageToken?: string
  ): Promise<{ messages: ChatMessage[]; next_page_token?: string }> {
    try {
      const token = await this.getAccessToken();
      
      const params = new URLSearchParams();
      if (toJid) params.append('to_jid', toJid);
      if (toContact) params.append('to_contact', toContact);
      if (toChannel) params.append('to_channel', toChannel);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      params.append('page_size', pageSize.toString());
      if (nextPageToken) params.append('next_page_token', nextPageToken);

      const response = await axios.get(
        `${this.baseUrl}/chat/users/me/messages?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        messages: response.data.messages || [],
        next_page_token: response.data.next_page_token
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  // Get channel members
  async getChannelMembers(channelId: string): Promise<ChatMember[]> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseUrl}/chat/channels/${channelId}/members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.members || [];
    } catch (error) {
      console.error('Error fetching channel members:', error);
      throw new Error('Failed to fetch channel members');
    }
  }

  // Add members to a channel
  async addChannelMembers(channelId: string, members: Array<{ email: string }>): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      await axios.patch(
        `${this.baseUrl}/chat/channels/${channelId}/members`,
        { members },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error adding channel members:', error);
      throw new Error('Failed to add channel members');
    }
  }

  // Remove member from channel
  async removeChannelMember(channelId: string, memberId: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      await axios.delete(
        `${this.baseUrl}/chat/channels/${channelId}/members/${memberId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error removing channel member:', error);
      throw new Error('Failed to remove channel member');
    }
  }

  // Update channel settings
  async updateChannel(channelId: string, updates: { name?: string; settings?: any }): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      await axios.patch(
        `${this.baseUrl}/chat/channels/${channelId}`,
        updates,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error updating channel:', error);
      throw new Error('Failed to update channel');
    }
  }

  // Delete a message
  async deleteMessage(messageId: string, toJid?: string, toContact?: string, toChannel?: string): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      const params = new URLSearchParams();
      if (toJid) params.append('to_jid', toJid);
      if (toContact) params.append('to_contact', toContact);
      if (toChannel) params.append('to_channel', toChannel);

      await axios.delete(
        `${this.baseUrl}/chat/users/me/messages/${messageId}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  // Update/Edit a message
  async updateMessage(
    messageId: string,
    message: string,
    toJid?: string,
    toContact?: string,
    toChannel?: string
  ): Promise<void> {
    try {
      const token = await this.getAccessToken();
      
      const updateData: any = { message };
      if (toJid) updateData.to_jid = toJid;
      if (toContact) updateData.to_contact = toContact;
      if (toChannel) updateData.to_channel = toChannel;

      await axios.patch(
        `${this.baseUrl}/chat/users/me/messages/${messageId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }

  // Upload file to chat
  async uploadFile(filePath: string, fileName: string, toJid?: string, toContact?: string, toChannel?: string): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const FormData = require('form-data');
      const fs = require('fs');
      
      const form = new FormData();
      form.append('files', fs.createReadStream(filePath), fileName);
      if (toJid) form.append('to_jid', toJid);
      if (toContact) form.append('to_contact', toContact);
      if (toChannel) form.append('to_channel', toChannel);

      const response = await axios.post(
        `${this.baseUrl}/chat/users/me/files`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            ...form.getHeaders(),
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }
}
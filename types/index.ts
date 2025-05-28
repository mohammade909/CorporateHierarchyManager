

// Types
export interface ZoomMeeting {
  id: string;
  topic: string;
  type: number;
  start_time: string;
  duration: number;
  timezone: string;
  password?: string;
  join_url: string;
  host_id: string;
  created_at: string;
}

export interface ZoomContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  presence_status: string;
}

export interface ZoomMessage {
  id: string;
  message: string;
  sender: string;
  date_time: string;
  timestamp: number;
  type?: 'text' | 'voice' | 'file';
}

export interface CreateMeetingRequest {
  topic?: string;
  start_time?: string;
  duration?: number;
  password?: string;
}

export interface SendMessageRequest {
  to_contact: string;
  message: string;
}

export interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ZoomMeetingsResponse {
  meetings: ZoomMeeting[];
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
}

export interface ZoomContactsResponse {
  contacts: ZoomContact[];
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
}

export interface ZoomMessagesResponse {
  messages: ZoomMessage[];
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

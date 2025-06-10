import axios from "axios";
import crypto from "crypto";

interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: number;
  pmi: number;
  timezone: string;
  verified: number;
  created_at: string;
  last_login_time: string;
  language: string;
  status: string;
}

interface CreateZoomUserRequest {
  action: "create";
  user_info: {
    email: string;
    type: number;
    first_name: string;
    last_name: string;
    password?: string;
  };
}

class ZoomService {
  private baseUrl = "https://api.zoom.us/v2";
  private accountId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.accountId = "OZWhroVYT0adDjOQOUAZSA";
    this.clientId = "eFwvmyl2TcSKNM1iyMTlng";
    this.clientSecret = "FYldVq4AcTDt9IclIp9eEkuTUc1IPff6";

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error("Missing Zoom API credentials in environment variables");
    }
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   */
  private async getAccessToken(): Promise<string> {
    // Check if current token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString("base64");

      const response = await axios.post(
        "https://zoom.us/oauth/token",
        new URLSearchParams({
          grant_type: "account_credentials",
          account_id: this.accountId,
        }),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      console.log(response.data)
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      return this.accessToken || "";
    } catch (error) {
      console.error("Error getting Zoom access token:", error);
      throw new Error("Failed to authenticate with Zoom API");
    }
  }

  /**
   * Create a new Zoom user
   */
  async createUser(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
  }): Promise<ZoomUser> {
    try {
      const token = await this.getAccessToken();
     
      const createUserData: CreateZoomUserRequest = {
        action: "create",
        user_info: {
          email: userData.email,
          type: 1, // Basic user type (1=Basic, 2=Licensed, 3=On-prem)
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
      };

      // Add password if provided (optional for SSO users)
      if (userData.password) {
        createUserData.user_info.password = userData.password;
      }

      const response = await axios.post(
        `${this.baseUrl}/users`,
        createUserData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Zoom API Error:", error.response?.data);

        // Handle specific Zoom API errors
        if (error.response?.status === 409) {
          throw new Error("User already exists in Zoom");
        } else if (error.response?.status === 400) {
          const errorMessage =
            error.response.data?.message || "Invalid user data";
          throw new Error(`Invalid user data: ${errorMessage}`);
        } else if (
          error.response?.status === 200 &&
          error.response.data?.message === "No privilege."
        ) {
          // Handle the privilege error specifically
          throw new Error(
            "Insufficient privileges: Your Zoom app lacks permission to create users. Please check your app scopes and account permissions."
          );
        } else if (error.response?.data?.message === "No privilege.") {
          throw new Error(
            "Insufficient privileges: Your Zoom app lacks permission to create users. Please check your app scopes and account permissions."
          );
        }
      }

      console.error("Error creating Zoom user:", error);
      throw new Error("Failed to create Zoom user");
    }
  }

  // Alternative method: Check privileges before attempting user creation
  async checkUserCreationPrivileges(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      // Try to get account info to verify privileges
      const response = await axios.get(`${this.baseUrl}/accounts/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Check if the account has user management privileges
      return response.data?.plan_type && response.data.plan_type !== "basic";
    } catch (error) {
      console.error("Error checking privileges:", error);
      return false;
    }
  }

  // Enhanced createUser method with privilege check
  async createUserWithPrivilegeCheck(userData: {
    email: string;
    firstName: string;
    lastName: string;
    password?: string;
  }): Promise<ZoomUser> {
    // First check if we have the necessary privileges
    const hasPrivileges = await this.checkUserCreationPrivileges();
    if (!hasPrivileges) {
      throw new Error(
        "Insufficient privileges: Your Zoom account or app does not have permission to create users. Please upgrade your Zoom plan or check your app configuration."
      );
    }

    // Proceed with user creation if privileges are confirmed
    return this.createUser(userData);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<ZoomUser | null> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${this.baseUrl}/users/${email}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null; // User not found
      }

      console.error("Error getting Zoom user:", error);
      throw new Error("Failed to get Zoom user");
    }
  }

  /**
   * Send a chat message between users
   */
  async sendChatMessage(
    fromEmail: string,
    toEmail: string,
    message: string
  ): Promise<void> {
    try {
      const token = await this.getAccessToken();

      // First, get the recipient user's ID
      const toUser = await this.getUserByEmail(toEmail);
      if (!toUser) {
        throw new Error("Recipient user not found in Zoom");
      }

      const messageData = {
        message,
        to_contact: toUser.id,
      };

      await axios.post(
        `${this.baseUrl}/chat/users/${fromEmail}/messages`,
        messageData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error sending Zoom chat message:", error);
      throw new Error("Failed to send Zoom chat message");
    }
  }

  /**
   * Update user database with Zoom user ID
   */
  async updateUserWithZoomData(
    userId: string,
    zoomUser: ZoomUser,
    storage: any
  ): Promise<void> {
    try {
      await storage.updateUser(userId, {
        zoomUserId: zoomUser.id,
        zoomEmail: zoomUser.email,
        zoomPmi: zoomUser.pmi,
      });
    } catch (error) {
      console.error("Error updating user with Zoom data:", error);
      throw new Error("Failed to update user with Zoom data");
    }
  }
}

export default ZoomService;

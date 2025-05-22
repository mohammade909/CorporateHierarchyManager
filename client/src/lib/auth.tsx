import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "./queryClient";

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: number | null;
  managerId: number | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: number | null;
  managerId?: number | null;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved token on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          // Decode the JWT to get user data
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
              })
              .join("")
          );

          const { userId, username, email, role, companyId } = JSON.parse(jsonPayload);
          
          // Fetch user details for complete profile
          const response = await fetch(`/api/users/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Token might be invalid/expired
            localStorage.removeItem("authToken");
            setUser(null);
          }
        } catch (error) {
          console.error("Failed to parse auth token:", error);
          localStorage.removeItem("authToken");
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      console.log("Attempting login for user:", username);
      
      // Use direct fetch to avoid token issues
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password }),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Login failed:", response.status, errorText);
        throw new Error(`Login failed: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Login successful, token received");
      
      // Store token immediately
      localStorage.setItem("authToken", data.token);
      setUser(data.user);
      
      // Print token details (first few characters for debugging)
      if (data.token) {
        console.log(`Token stored: ${data.token.substring(0, 15)}...`);
      }
      
      return data;
    } catch (error) {
      console.error("Login process failed:", error);
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData) => {
    try {
      const response = await apiRequest("POST", "/api/auth/register", userData);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
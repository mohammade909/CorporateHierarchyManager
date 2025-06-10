import { QueryClient, QueryFunction } from "@tanstack/react-query";
const API_BASE_URL ='http://localhost:5000'
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    console.log(`API Request to ${url} with token: ${token.substring(0, 15)}...`);
  } else {
    console.warn(`API Request to ${url} with NO TOKEN`);
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error (${res.status}): ${errorText}`);
      throw new Error(`${res.status}: ${errorText}`);
    }
    
    return res;
  } catch (error) {
    console.error(`API Request failed: ${error}`);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log(`Query Request to ${queryKey[0]} with token: ${token.substring(0, 15)}...`);
    } else {
      console.warn(`Query Request to ${queryKey[0]} with NO TOKEN`);
    }
    
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
        headers
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.warn(`401 Unauthorized response for ${queryKey[0]}`);
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Query Error (${res.status}): ${errorText}`);
        throw new Error(`${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(`Query failed: ${error}`);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});


export const uploadFile = async (
  endpoint: string,
  formData: FormData,
  headers?: Record<string, string>
): Promise<Response> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    method: 'POST',
    headers: {
      ...headers,
    },
    body: formData,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
};
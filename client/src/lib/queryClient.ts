import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Determine API base URL for different environments
export const API_BASE_URL = getApiBaseUrl();

function getApiBaseUrl() {
  // In production (Vercel), API requests go to the same host
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5001';
    }
    
    // For Vercel deployment - use relative URLs
    return '';
  }
  
  // Fallback (this should rarely be used)
  return 'http://localhost:5001';
}

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorDetails = "";
    
    try {
      // Try to parse the error as JSON if possible
      const errorJson = JSON.parse(text);
      errorDetails = errorJson.details ? ` (${errorJson.details})` : "";
    } catch (e) {
      // If not JSON or parsing fails, use text as is
    }
    
    console.error(`API Error ${res.status}: ${text}${errorDetails}`);
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Add API_BASE_URL if the URL doesn't already include http
  // And ensure it works properly in both environments
  const isAbsoluteUrl = url.startsWith('http');
  const isApiUrl = url.startsWith('/api/');
  
  let fullUrl = url;
  if (!isAbsoluteUrl) {
    if (isApiUrl) {
      fullUrl = `${API_BASE_URL}${url}`;
    } else {
      // If it's not an API URL and not absolute, ensure it has a leading slash
      fullUrl = url.startsWith('/') ? url : `/${url}`;
    }
  }
  
  console.log(`Making ${method} request to: ${fullUrl}`);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed for ${method} ${fullUrl}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const isAbsoluteUrl = url.startsWith('http');
    const isApiUrl = url.startsWith('/api/');
    
    let fullUrl = url;
    if (!isAbsoluteUrl && isApiUrl) {
      fullUrl = `${API_BASE_URL}${url}`;
    }
    
    console.log(`Fetching data from: ${fullUrl}`);
    
    try {
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized (401) for ${fullUrl}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(`Query failed for ${fullUrl}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,  // Allow refreshing data when window gets focus
      staleTime: 5 * 60 * 1000,    // Data considered fresh for 5 minutes
      retry: 3,                    // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,  // Retry mutations once
    },
  },
});

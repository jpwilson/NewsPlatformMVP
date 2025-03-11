import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

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
  // Get the Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Build headers
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add auth token if available
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
    console.log(`API Request ${method} ${url} - Auth token present (${session.access_token.substring(0, 10)}...)`);
  } else {
    console.warn(`API Request ${method} ${url} - No auth token available`);
  }

  console.log(`Sending ${method} request to ${url}`);
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`Response from ${url}: ${res.status} ${res.statusText}`);
  
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    
    // Build headers
    const headers: Record<string, string> = {};
    
    // Add auth token if available
    const url = queryKey[0] as string;
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
      console.log(`Query ${url} - Auth token present (${session.access_token.substring(0, 10)}...)`);
    } else {
      console.warn(`Query ${url} - No auth token available`);
    }

    console.log(`Fetching data from ${url}`);
    
    const res = await fetch(url, {
      credentials: "include",
      headers
    });

    console.log(`Response from ${url}: ${res.status} ${res.statusText}`);
    
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.warn(`Unauthorized access to ${url}, returning null as configured`);
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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

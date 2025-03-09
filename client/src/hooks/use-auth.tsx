import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import {
  insertUserSchema,
  User as SelectUser,
  InsertUser,
} from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  isGuestMode: boolean;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

// Detect if we're on Vercel deployment
const isVercelDeployment =
  typeof window !== "undefined" &&
  window.location.hostname.includes("vercel.app");

// Create a guest user for Vercel deployment only
const GUEST_USER: SelectUser = {
  id: 999,
  username: "demo_user",
  password: "",
  description: "Demo User Account",
  supabase_uid: null,
  created_at: new Date(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);

  // Check if we're on Vercel and switch to guest mode if needed
  useEffect(() => {
    if (isVercelDeployment) {
      console.info("Running on Vercel deployment - enabling guest mode");
      setIsGuestMode(true);

      // Show toast notification to inform users
      toast({
        title: "Demo Mode Activated",
        description:
          "Using guest account for Vercel demo. Some features are limited.",
        duration: 6000,
      });
    }
  }, []);

  // Normal authentication for local development
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !isGuestMode, // Don't run this query in guest mode
  });

  // Use the guest user or normal user data
  const currentUser = isGuestMode ? GUEST_USER : user ?? null;

  // Original mutation implementations
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      if (isGuestMode) {
        // Simulate login in guest mode
        return GUEST_USER;
      }
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      if (isVercelDeployment && !isGuestMode) {
        console.warn("Login failed, switching to guest mode");
        setIsGuestMode(true);
        return;
      }

      toast({
        title: "Login failed",
        description:
          "Invalid username or password. Please try again or register for a new account.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      if (isGuestMode) {
        // Simulate registration in guest mode
        return GUEST_USER;
      }
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (isGuestMode) {
        // Nothing to do in guest mode
        return;
      }
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        isLoading: isLoading && !isGuestMode,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        isGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

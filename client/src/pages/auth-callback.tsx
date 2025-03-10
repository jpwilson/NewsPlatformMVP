import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import "../lib/oauth-debug"; // Add debug utilities

export default function AuthCallback() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Log the current URL for debugging
        console.log("Auth callback running at:", window.location.href);

        // Get session from URL
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Supabase auth session error:", error);
          setError(error.message);
          return;
        }

        if (!session) {
          console.error("No session found in auth callback");
          setError("No session found");
          return;
        }

        // Get user details from session
        const { user } = session;
        console.log("Supabase user:", user);

        // Build the callback URL using the current domain
        const callbackUrl = `${window.location.origin}/api/auth/supabase-callback`;
        console.log("Sending callback to:", callbackUrl);

        // Call your backend to create or get user
        const response = await fetch(callbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supabase_uid: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name,
          }),
        });

        const result = await response.json();
        console.log("Server response:", result);

        if (result.success) {
          // Redirect to home page ON THE SAME DOMAIN
          console.log("Authentication successful, redirecting to home page");
          window.location.href = `${window.location.origin}/`;
        } else {
          console.error("Authentication failed:", result.error);
          setError(result.error || "Failed to authenticate");
        }
      } catch (err) {
        console.error("Error in auth callback:", err);
        setError("An unexpected error occurred");
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Authentication Callback</h1>
        <p className="mb-4">{status}</p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mt-4 w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}

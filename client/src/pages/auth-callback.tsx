import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus("Processing authentication...");
        console.log("Auth callback: Starting auth callback processing");

        // Get session from URL
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback: Session error", error);
          setStatus("Authentication failed");
          setError(error.message);
          return;
        }

        if (!session) {
          console.error("Auth callback: No session found");
          setStatus("Authentication failed");
          setError("No session found");
          return;
        }

        // Get user details from session
        const { user } = session;
        console.log("Auth callback: Supabase user:", user?.id);
        setStatus("User authenticated, syncing with backend...");

        // Store auth token in localStorage for API requests
        localStorage.setItem("supabase_auth_token", session.access_token);

        // Call your backend to create or get user
        const response = await fetch("/api/auth/supabase-callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            supabase_uid: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name,
          }),
        });

        // Check if we got a response
        if (!response.ok) {
          console.error(
            `Auth callback: Backend error ${response.status}`,
            await response.text()
          );
          setStatus("Backend sync failed");
          setError(`Server error: ${response.status}`);
          return;
        }

        const result = await response.json();
        console.log("Auth callback: Server response:", result);

        if (result.success) {
          setStatus("Success! Redirecting...");

          // Get the current URL to determine if we're on Vercel or localhost
          const currentUrl = window.location.origin;
          console.log(
            `Auth callback: Redirecting to home page on ${currentUrl}`
          );

          // Redirect to home page
          window.location.href = "/";
        } else {
          console.error(
            "Auth callback: Backend reported failure",
            result.error
          );
          setStatus("Authentication failed");
          setError(result.error || "Failed to authenticate");
        }
      } catch (err) {
        console.error("Auth callback: Unexpected error", err);
        setStatus("Error during authentication");
        setError("An unexpected error occurred");
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Authentication Callback</h1>
        <p className="text-xl mb-2">{status}</p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="mt-4 w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
}

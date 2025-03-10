import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus("Processing authentication...");

        // Get the origin that initiated the auth flow
        const authOrigin =
          localStorage.getItem("auth_origin") || window.location.origin;
        console.log(`Auth callback: Retrieved origin: ${authOrigin}`);

        // Log the current page URL
        console.log(`Auth callback: Current URL: ${window.location.href}`);

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
        console.log("Auth callback: Supabase user ID:", user?.id);
        setStatus(`User authenticated (${user.email})`);

        // Store auth token in localStorage for API requests
        localStorage.setItem("supabase_auth_token", session.access_token);

        // Call your backend to create or get user
        try {
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
            console.error(`Auth callback: Backend error ${response.status}`);
            setStatus("Backend sync failed");
            setError(`Server error: ${response.status}`);
            return;
          }

          const result = await response.json();
          console.log("Auth callback: Backend response:", result);

          // Set a message before redirecting
          setStatus("Success! Redirecting...");

          // Explicitly redirect to the same domain's homepage
          const redirectUrl = new URL("/", authOrigin).toString();
          console.log(`Auth callback: Redirecting to ${redirectUrl}`);

          // Short delay for user to see success message
          setTimeout(() => {
            // Clear any localhost references to avoid confusion
            if (
              localStorage.getItem("auth_origin")?.includes("localhost") &&
              !window.location.origin.includes("localhost")
            ) {
              localStorage.removeItem("auth_origin");
            }

            // Use hard redirect to the root page on the current domain
            window.location.href = redirectUrl;
          }, 500);
        } catch (err) {
          console.error("Auth callback: Error communicating with backend", err);
          setStatus("Authentication failed");
          setError("Error communicating with backend");
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
        {!error && (
          <div className="mt-4 w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        )}
      </div>
    </div>
  );
}

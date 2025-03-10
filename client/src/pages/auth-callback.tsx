import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Processing authentication...");
  const [error, setError] = useState("");
  const [debug, setDebug] = useState<any>({});

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus("Getting session from URL...");

        // Log hash for debugging
        console.log("Full URL:", window.location.href);
        console.log("URL hash:", window.location.hash);
        console.log("URL search:", window.location.search);
        console.log("URL origin:", window.location.origin);

        // Get session from URL
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session error:", sessionError);
          setError(sessionError.message);
          setDebug({ type: "session_error", details: sessionError });
          return;
        }

        if (!session) {
          console.error("No session found");
          setError("No session found");
          setDebug({ type: "no_session" });
          return;
        }

        // Get user details from session
        const { user } = session;
        console.log("Supabase user:", user);
        setStatus("User authenticated, sending to backend...");

        // Call your backend to create or get user
        const response = await fetch("/api/auth/supabase-callback", {
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
        setDebug({ type: "server_response", details: result });

        if (result.success) {
          setStatus("Authentication successful, redirecting...");
          // Don't use window.location.origin which could be localhost on deployed sites
          // Look at the current URL without the path
          const baseUrl = window.location.href.split("/auth-callback")[0];
          console.log("Redirecting to:", baseUrl);
          window.location.href = baseUrl;
        } else {
          setError(result.error || "Failed to authenticate");
        }
      } catch (err) {
        console.error("Error in auth callback:", err);
        setError("An unexpected error occurred");
        setDebug({ type: "unexpected_error", error: String(err) });
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Authentication Callback</h1>
        {error ? (
          <p className="mb-4 text-red-500">{error}</p>
        ) : (
          <p className="mb-4">{status}</p>
        )}
        {!error && (
          <div className="mt-4 w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        )}

        {/* Debug info */}
        {(error || Object.keys(debug).length > 0) && (
          <div className="mt-6 text-left text-sm bg-gray-100 p-4 rounded overflow-auto max-h-64">
            <h3 className="font-bold mb-2">Debug Info:</h3>
            <pre>{JSON.stringify(debug, null, 2)}</pre>
            <p className="mt-2">URL: {window.location.href}</p>
          </div>
        )}
      </div>
    </div>
  );
}

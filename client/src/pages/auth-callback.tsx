import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const [status, setStatus] = useState("Loading...");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get session from URL
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setError(error.message);
          return;
        }

        if (!session) {
          setError("No session found");
          return;
        }

        // Get user details from session
        const { user } = session;
        console.log("Supabase user:", user);

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

        if (result.success) {
          // Redirect to home page using current origin
          window.location.href = "/";
        } else {
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
        {error ? (
          <p className="mb-4 text-red-500">{error}</p>
        ) : (
          <p className="mb-4">{status}</p>
        )}
        {!error && (
          <div className="mt-4 w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        )}
      </div>
    </div>
  );
}

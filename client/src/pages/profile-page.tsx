import { useAuth } from "@/hooks/use-auth";
import { NavigationBar } from "@/components/navigation-bar";
import { Redirect } from "wouter";

export default function ProfilePage() {
  const { user } = useAuth();

  // If not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">{user.username}</h2>
          {/* More profile content will be added here later */}
        </div>
      </div>
    </div>
  );
}

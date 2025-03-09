import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { SelectedChannelProvider } from "@/hooks/use-selected-channel";
import { ThemeProvider } from "@/hooks/use-theme";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ArticlePage from "@/pages/article-page";
import CreateArticle from "@/pages/create-article";
import CreateChannel from "@/pages/create-channel";
import ChannelPage from "@/pages/channel-page";
import ChannelsPage from "@/pages/channels-page";
import AuthCallback from "./pages/auth-callback";
import ProfilePage from "./pages/profile-page";
import EditArticle from "@/pages/edit-article";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <ProtectedRoute
        path="/channels/:id/articles/new"
        component={CreateArticle}
      />
      <ProtectedRoute path="/channels/new" component={CreateChannel} />
      <Route path="/channels/:id" component={ChannelPage} />
      <Route path="/channels" component={ChannelsPage} />
      <ProtectedRoute path="/articles/new" component={CreateArticle} />
      <ProtectedRoute path="/articles/:id/edit" component={EditArticle} />
      <Route path="/articles/:id" component={ArticlePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth-callback" component={AuthCallback} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SelectedChannelProvider>
          <ThemeProvider defaultTheme="light">
            <Router />
            <Toaster />
            {/* Diagnostic tool - available in Vercel deployment */}
            {typeof window !== "undefined" &&
              window.location.hostname.includes("vercel.app") && (
                <div className="fixed bottom-4 right-4 z-50">
                  <button
                    onClick={async () => {
                      try {
                        console.log("Testing database connection...");
                        const res = await fetch("/api/test-db");
                        const data = await res.json();
                        console.log("Database test result:", data);
                        alert(
                          data.success
                            ? `✅ Database connection successful! (${data.duration})`
                            : `❌ Database connection failed: ${data.error}`
                        );
                      } catch (err) {
                        console.error("Error running database test:", err);
                        alert(
                          `❌ Error testing database: ${
                            err instanceof Error ? err.message : String(err)
                          }`
                        );
                      }
                    }}
                    className="bg-black text-white px-3 py-1 rounded-md text-sm shadow-lg"
                  >
                    Test DB Connection
                  </button>
                </div>
              )}
          </ThemeProvider>
        </SelectedChannelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ArticlePage from "@/pages/article-page";
import CreateArticle from "@/pages/create-article";
import CreateChannel from "@/pages/create-channel";
import ChannelPage from "@/pages/channel-page"; // Add this import

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <ProtectedRoute path="/articles/new" component={CreateArticle} />
      <ProtectedRoute path="/channels/new" component={CreateChannel} />
      <Route path="/articles/:id" component={ArticlePage} />
      <Route path="/channels/:id" component={ChannelPage} /> {/* Add this route */}
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
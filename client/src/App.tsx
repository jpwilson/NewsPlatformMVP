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
          </ThemeProvider>
        </SelectedChannelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

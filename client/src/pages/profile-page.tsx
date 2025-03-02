import { useAuth } from "@/hooks/use-auth";
import { NavigationBar } from "@/components/navigation-bar";
import { Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Channel, Article } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, PlusCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Helper function to format date safely
const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return "Invalid date";
  }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null
  );

  // If not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Fetch user's channels
  const { data: channels, isLoading: loadingChannels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    select: (channels) => channels.filter((c) => c.userId === user.id),
  });

  // Set the first channel as default when channels are loaded
  // and no channel is selected yet
  if (channels?.length && !selectedChannelId && !loadingChannels) {
    setSelectedChannelId(String(channels[0].id));
  }

  // Fetch articles for the selected channel
  const { data: articles, isLoading: loadingArticles } = useQuery<Article[]>({
    queryKey: [`/api/channels/${selectedChannelId}/articles`],
    enabled: !!selectedChannelId,
    select: (data) => data || [],
  });

  // Find the selected channel object
  const selectedChannel = channels?.find(
    (channel) => channel.id === Number(selectedChannelId)
  );

  const handleChannelChange = (value: string) => {
    setSelectedChannelId(value);
  };

  if (loadingChannels) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Link href="/channels/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Channel
            </Button>
          </Link>
        </div>

        <div className="grid gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Username
                  </span>
                  <span className="font-medium">{user.username}</span>
                </div>
                {/* Add more user info here when available */}
              </div>
            </CardContent>
          </Card>

          {/* Channels Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Channels</CardTitle>
              <CardDescription>
                Select a channel to view its articles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {channels?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  You don't have any channels yet
                </div>
              ) : (
                <div className="space-y-4">
                  <Select
                    value={selectedChannelId || ""}
                    onValueChange={handleChannelChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {channels?.map((channel) => (
                        <SelectItem key={channel.id} value={String(channel.id)}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedChannel && (
                    <div className="space-y-2 mt-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                          Description
                        </span>
                        <span>{selectedChannel.description}</span>
                      </div>
                      {selectedChannel.category && (
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">
                            Category
                          </span>
                          <span>{selectedChannel.category}</span>
                        </div>
                      )}
                      {selectedChannel.location && (
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">
                            Location
                          </span>
                          <span>{selectedChannel.location}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Articles Card */}
          {selectedChannel && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Articles in {selectedChannel.name}</CardTitle>
                  <Link href="/articles/new">
                    <Button size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Article
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loadingArticles ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articles?.length ? (
                        articles.map((article) => (
                          <TableRow key={article.id}>
                            <TableCell>
                              <Link href={`/articles/${article.id}`}>
                                <a className="hover:underline text-primary">
                                  {article.title}
                                </a>
                              </Link>
                            </TableCell>
                            <TableCell>{article.category}</TableCell>
                            <TableCell>
                              {formatDate(article.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-muted-foreground"
                          >
                            No articles published in this channel yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

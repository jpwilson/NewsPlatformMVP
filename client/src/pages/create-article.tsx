import { NavigationBar } from "@/components/navigation-bar";
import { ArticleEditor } from "@/components/article-editor";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export default function CreateArticle() {
  const { user } = useAuth();
  const [location] = useLocation();
  // Extract channel ID from params if present (for /channels/:id/articles/new route)
  const params = useParams<{ id: string }>();
  const channelIdFromParams = params?.id;

  // Get the channel ID from the URL path if available
  const pathChannelId = channelIdFromParams
    ? parseInt(channelIdFromParams, 10)
    : undefined;

  // Only use the extracted ID if it's valid
  const currentChannelId = !isNaN(Number(pathChannelId))
    ? pathChannelId
    : undefined;

  useEffect(() => {
    console.log("Create Article - Current location:", location);
    console.log(
      "Create Article - Channel ID from params:",
      channelIdFromParams
    );
    console.log("Create Article - Current channel ID:", currentChannelId);
  }, [location, channelIdFromParams, currentChannelId]);

  const { data: channels, isLoading } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    select: (channels) => channels.filter((c) => c.userId === user?.id),
  });

  // Get the current channel if it exists
  const currentChannel =
    currentChannelId !== undefined && channels
      ? channels.find((c) => c.id === currentChannelId)
      : undefined;

  useEffect(() => {
    if (channels) {
      console.log(
        "Create Article - Available channels:",
        channels.map((c) => ({ id: c.id, name: c.name }))
      );
      console.log("Create Article - Selected channel:", currentChannel);
    }
  }, [channels, currentChannel]);

  // Default to the current channel or the first one in the list
  const defaultChannelId = currentChannel
    ? currentChannel.id
    : channels && channels.length > 0
    ? channels[0].id
    : undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar selectedChannelId={currentChannelId} />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!channels?.length) {
    return <Redirect to="/channels/new" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar selectedChannelId={currentChannelId} />

      <div className="container mx-auto p-4 lg:p-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Create Article</h1>
        <ArticleEditor
          channels={channels}
          defaultChannelId={defaultChannelId}
        />
      </div>
    </div>
  );
}

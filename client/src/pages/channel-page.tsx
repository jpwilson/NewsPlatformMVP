import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Article, Channel, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowUpDown, PlusCircle } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type SortField = "title" | "createdAt" | "category";
type SortOrder = "asc" | "desc";

// Extended Channel type that includes created_at
type ExtendedChannel = Channel & {
  created_at?: string;
};

// Helper function to format date safely
const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return "Invalid date";
  }
};

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch current channel
  const { data: channel, isLoading: loadingChannel } =
    useQuery<ExtendedChannel>({
      queryKey: [`/api/channels/${id}`],
    });

  // Fetch articles for this channel
  const { data: articles, isLoading: loadingArticles } = useQuery<Article[]>({
    queryKey: [`/api/channels/${id}/articles`],
    select: (data) => data || [], // Ensure we always have an array
  });

  // Fetch all channels owned by the current user
  const { data: userChannels, isLoading: loadingUserChannels } = useQuery<
    Channel[]
  >({
    queryKey: ["/api/channels"],
    select: (channels) => channels.filter((c) => c.userId === user?.id),
    enabled: !!user, // Only run if user is logged in
  });

  // Fetch user's subscriptions to determine if subscribed to this channel
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery<
    Channel[]
  >({
    queryKey: ["/api/user/subscriptions"],
    enabled: !!user, // Only run if user is logged in
  });

  // Fetch channel owner information
  const { data: ownerInfo, isLoading: loadingOwner } = useQuery<
    Omit<User, "password">
  >({
    queryKey: [`/api/users/${channel?.userId}`],
    enabled: !!channel?.userId,
  });

  const isOwner = user?.id === channel?.userId;
  const isSubscribed =
    subscriptions?.some((sub: Channel) => sub.id === Number(id)) || false;

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleChannelChange = (channelId: string) => {
    setLocation(`/channels/${channelId}`);
  };

  const sortedArticles = articles?.slice().sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    if (sortField === "createdAt") {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return multiplier * (dateA - dateB);
    }
    const aValue = a[sortField] || "";
    const bValue = b[sortField] || "";
    return multiplier * (aValue < bValue ? -1 : 1);
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/channels/${id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
      toast({
        title: "Subscribed",
        description: `You are now subscribed to ${channel?.name}`,
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/channels/${id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
      toast({
        title: "Unsubscribed",
        description: `You have unsubscribed from ${channel?.name}`,
      });
    },
  });

  if (
    loadingChannel ||
    loadingArticles ||
    (user && loadingUserChannels) ||
    (user && loadingSubscriptions) ||
    loadingOwner
  ) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto p-4 lg:p-8">
          <div className="text-center">Channel not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      <div className="container mx-auto p-4 lg:p-8">
        {/* Channel selector (only visible to owner) */}
        {isOwner && userChannels && userChannels.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="text-sm font-medium">Switch channel:</h2>
              <Select value={id} onValueChange={handleChannelChange}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {userChannels.map((userChannel) => (
                    <SelectItem
                      key={userChannel.id}
                      value={String(userChannel.id)}
                    >
                      {userChannel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
          <div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">{channel.name}</h1>
                {channel.created_at && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Created on {formatDate(channel.created_at)}
                  </p>
                )}
                <p className="text-muted-foreground">{channel.description}</p>
                {channel.category && (
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {channel.category}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {isOwner && (
                  <Link href="/articles/new">
                    <Button variant="default">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Article
                    </Button>
                  </Link>
                )}
                {isOwner && <Button variant="outline">Edit Channel</Button>}
                {!isOwner && user && (
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    onClick={() =>
                      isSubscribed
                        ? unsubscribeMutation.mutate()
                        : subscribeMutation.mutate()
                    }
                    disabled={
                      subscribeMutation.isPending ||
                      unsubscribeMutation.isPending
                    }
                  >
                    {isSubscribed ? "Unsubscribe" : "Subscribe"}
                  </Button>
                )}
              </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Articles</h2>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("title")}
                      >
                        Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("category")}
                      >
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("createdAt")}
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedArticles?.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <a
                          href={`/articles/${article.id}`}
                          className="hover:underline text-primary"
                        >
                          {article.title}
                        </a>
                      </TableCell>
                      <TableCell>{article.category}</TableCell>
                      <TableCell>{formatDate(article.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {!sortedArticles?.length && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        No articles published yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-xl font-semibold mb-4">Channel Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">
                    {articles?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">
                    Subscribers
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground mt-4">
                    Created by{" "}
                    <Link
                      href={`/profile`}
                      className="text-primary hover:underline"
                    >
                      {ownerInfo?.username || `User #${channel.userId}`}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Channel Settings</h2>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline">
                    Manage Subscribers
                  </Button>
                  <Button className="w-full" variant="outline">
                    Channel Analytics
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

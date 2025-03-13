import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Channel, User } from "@shared/schema";
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
import {
  Loader2,
  ArrowUpDown,
  PlusCircle,
  Pencil,
  Check,
  X,
  Eye,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArticleWithSnakeCase } from "@/types/article";
import { formatDate } from "@/lib/date-utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AuthDialog } from "@/components/auth-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortField =
  | "title"
  | "createdAt"
  | "category"
  | "viewCount"
  | "commentCount"
  | "likeCount";
type SortOrder = "asc" | "desc";

// Extended Channel type that includes created_at
type ExtendedChannel = Channel & {
  created_at?: string;
  user_id?: number;
  subscriberCount?: number;
};

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activeTab, setActiveTab] = useState("published");
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [authDialogOpen, setAuthDialogOpen] = useState(!user);

  // Redirect to home if auth dialog is closed without login
  useEffect(() => {
    if (!user && !authDialogOpen) {
      setLocation("/");
    }
  }, [user, authDialogOpen, setLocation]);

  // Fetch current channel
  const { data: channel, isLoading: loadingChannel } =
    useQuery<ExtendedChannel>({
      queryKey: [`/api/channels/${id}`],
    });

  // Debug channel data when it changes
  useEffect(() => {
    if (channel) {
      console.log("Channel data loaded:", channel);
      console.log("created_at value:", channel.created_at);
    }
  }, [channel]);

  // Fetch articles for this channel
  const { data: articles, isLoading: loadingArticles } = useQuery<
    ArticleWithSnakeCase[]
  >({
    queryKey: [`/api/channels/${id}/articles`],
    select: (data) => data || [], // Ensure we always have an array
  });

  // Fetch draft articles for this channel (only for channel owner)
  const { data: drafts, isLoading: loadingDrafts } = useQuery<
    ArticleWithSnakeCase[]
  >({
    queryKey: [`/api/channels/${id}/drafts`],
    select: (data) => data || [], // Ensure we always have an array
    enabled:
      !!user &&
      !!(channel?.user_id === user?.id || channel?.userId === user?.id),
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
    queryKey: [`/api/users/${channel?.user_id || channel?.userId}`],
    enabled: !!(channel?.user_id || channel?.userId),
  });

  // Force refetch subscriptions on channel visit to ensure we have latest data
  useEffect(() => {
    if (user && channel) {
      // Refetch subscriptions when channel page loads
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
    }
  }, [user, channel, queryClient]);

  // Determine if the current user is subscribed to this channel
  const isOwner = user?.id === (channel?.user_id || channel?.userId);

  // Simplified robust checking for subscription status
  const isSubscribed = useMemo(() => {
    if (!subscriptions || !id) return false;

    const channelId = parseInt(id);

    // Log data for debugging
    console.log("Channel ID:", channelId);
    console.log("Subscriptions:", subscriptions);

    // Check if the channel ID exists in any of the user's subscriptions
    // either as channel_id property or channel.id property
    return subscriptions.some((sub: any) => {
      // If sub has a channel_id property
      if (sub.channel_id !== undefined) {
        return parseInt(sub.channel_id) === channelId;
      }

      // If sub has a channelId property
      if (sub.channelId !== undefined) {
        return parseInt(sub.channelId) === channelId;
      }

      // If sub itself is the channel or has nested channel property
      if (sub.id !== undefined) {
        return parseInt(sub.id) === channelId;
      }

      // If sub has a nested channel property
      if (sub.channel && sub.channel.id !== undefined) {
        return parseInt(sub.channel.id) === channelId;
      }

      return false;
    });
  }, [subscriptions, id]);

  // Initialize edit form fields when channel data is loaded
  useEffect(() => {
    if (channel) {
      setEditedName(channel.name);
      setEditedDescription(channel.description);
      setEditedCategory(channel.category || "");
    }
  }, [channel]);

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/channels/${id}`, {
        name: editedName,
        description: editedDescription,
        category: editedCategory || null,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      setIsEditing(false);
      toast({
        title: "Channel updated",
        description: "Your channel has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update the channel.",
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    updateChannelMutation.mutate();
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (channel) {
      setEditedName(channel.name);
      setEditedDescription(channel.description);
      setEditedCategory(channel.category || "");
    }
    setIsEditing(false);
  };

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

  // Sort published articles
  const sortedArticles = articles?.slice().sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    if (sortField === "createdAt") {
      const dateA =
        a.createdAt || a.created_at
          ? new Date(a.createdAt || a.created_at!).getTime()
          : 0;
      const dateB =
        b.createdAt || b.created_at
          ? new Date(b.createdAt || b.created_at!).getTime()
          : 0;
      return multiplier * (dateA - dateB);
    } else if (sortField === "viewCount") {
      const viewsA = Number(a.viewCount || a.view_count || 0);
      const viewsB = Number(b.viewCount || b.view_count || 0);
      return multiplier * (viewsA - viewsB);
    } else if (sortField === "commentCount") {
      const commentsA = Number(
        a.commentCount || a.comment_count || a._count?.comments || 0
      );
      const commentsB = Number(
        b.commentCount || b.comment_count || b._count?.comments || 0
      );
      return multiplier * (commentsA - commentsB);
    } else if (sortField === "likeCount") {
      const likesA = Number(
        a.likeCount || a.like_count || a.likes || a._count?.likes || 0
      );
      const likesB = Number(
        b.likeCount || b.like_count || b.likes || b._count?.likes || 0
      );
      return multiplier * (likesA - likesB);
    }
    const aValue = a[sortField] || "";
    const bValue = b[sortField] || "";
    return multiplier * (aValue < bValue ? -1 : 1);
  });

  // Sort draft articles
  const sortedDrafts = drafts?.slice().sort((a, b) => {
    // Get the correct creation date from either camelCase or snake_case property
    const dateA = a.createdAt || a.created_at;
    const dateB = b.createdAt || b.created_at;

    // Sort by the selected field
    switch (sortField) {
      case "title":
        if (sortOrder === "asc") {
          return a.title.localeCompare(b.title);
        }
        return b.title.localeCompare(a.title);
      case "category":
        if (sortOrder === "asc") {
          return a.category.localeCompare(b.category);
        }
        return b.category.localeCompare(a.category);
      case "viewCount":
        const viewsA = Number(a.viewCount || a.view_count || 0);
        const viewsB = Number(b.viewCount || b.view_count || 0);
        return sortOrder === "asc" ? viewsA - viewsB : viewsB - viewsA;
      case "commentCount":
        const commentsA = Number(
          a.commentCount || a.comment_count || a._count?.comments || 0
        );
        const commentsB = Number(
          b.commentCount || b.comment_count || b._count?.comments || 0
        );
        return sortOrder === "asc"
          ? commentsA - commentsB
          : commentsB - commentsA;
      case "likeCount":
        const likesA = Number(
          a.likeCount || a.like_count || a.likes || a._count?.likes || 0
        );
        const likesB = Number(
          b.likeCount || b.like_count || b.likes || b._count?.likes || 0
        );
        return sortOrder === "asc" ? likesA - likesB : likesB - likesA;
      case "createdAt":
      default:
        if (sortOrder === "asc") {
          return (
            new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime()
          );
        }
        return new Date(dateB || 0).getTime() - new Date(dateA || 0).getTime();
    }
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/channels/${id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${id}`] });
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
      queryClient.invalidateQueries({ queryKey: [`/api/channels/${id}`] });
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
      <NavigationBar selectedChannelId={id} />

      {/* Auth Dialog for non-logged in users */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        description="You need to be logged in to view channel details."
      />

      {/* Only show channel content to logged in users */}
      {user && (
        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="channel-name">Channel Name</Label>
                        <Input
                          id="channel-name"
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="max-w-md"
                        />
                      </div>
                      <div>
                        <Label htmlFor="channel-description">Description</Label>
                        <Textarea
                          id="channel-description"
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          className="max-w-md"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="channel-category">
                          Category (optional)
                        </Label>
                        <Input
                          id="channel-category"
                          type="text"
                          value={editedCategory}
                          onChange={(e) => setEditedCategory(e.target.value)}
                          className="max-w-md"
                          placeholder="e.g. Technology, Sports, News"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-4xl font-bold mb-2">
                        {channel.name}
                      </h1>
                      {channel.created_at && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Created on {formatDate(channel.created_at)}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {channel.description}
                      </p>
                      {channel.category && (
                        <div className="mt-2">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {channel.category}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {isOwner &&
                    (isEditing ? (
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          onClick={handleSaveChanges}
                          disabled={updateChannelMutation.isPending}
                        >
                          {updateChannelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Save
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Channel
                      </Button>
                    ))}

                  {!isOwner && user && !isEditing && (
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
                      {subscribeMutation.isPending ||
                      unsubscribeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      {isSubscribed ? "Unsubscribe" : "Subscribe"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Articles</h2>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Link href={`/channels/${id}/articles/new`}>
                      <Button variant="default">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        New Article
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  {isOwner && <TabsTrigger value="drafts">Drafts</TabsTrigger>}
                </TabsList>

                <TabsContent
                  value="published"
                  className="rounded-lg border bg-card mt-2"
                >
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
                        <TableHead className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="px-2"
                                  onClick={() => handleSort("viewCount")}
                                >
                                  <Eye className="h-4 w-4" />
                                  {sortField === "viewCount" && (
                                    <ArrowUpDown
                                      className={`ml-2 h-3 w-3 ${
                                        sortOrder === "asc" ? "rotate-180" : ""
                                      }`}
                                    />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Views</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                        <TableHead className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="px-2"
                                  onClick={() => handleSort("commentCount")}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                  {sortField === "commentCount" && (
                                    <ArrowUpDown
                                      className={`ml-2 h-3 w-3 ${
                                        sortOrder === "asc" ? "rotate-180" : ""
                                      }`}
                                    />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Comments</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableHead>
                        <TableHead className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="px-2"
                                  onClick={() => handleSort("likeCount")}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  {sortField === "likeCount" && (
                                    <ArrowUpDown
                                      className={`ml-2 h-3 w-3 ${
                                        sortOrder === "asc" ? "rotate-180" : ""
                                      }`}
                                    />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Likes</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                          <TableCell>
                            {formatDate(
                              article.createdAt || article.created_at
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(
                              article.viewCount || article.view_count || 0
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(
                              article.commentCount ||
                                article.comment_count ||
                                article._count?.comments ||
                                0
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(
                              article.likeCount ||
                                article.like_count ||
                                article.likes ||
                                article._count?.likes ||
                                0
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!sortedArticles?.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No articles published yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {isOwner && (
                  <TabsContent
                    value="drafts"
                    className="rounded-lg border bg-card mt-2"
                  >
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
                          <TableHead className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="px-2"
                                    onClick={() => handleSort("viewCount")}
                                  >
                                    <Eye className="h-4 w-4" />
                                    {sortField === "viewCount" && (
                                      <ArrowUpDown
                                        className={`ml-2 h-3 w-3 ${
                                          sortOrder === "asc"
                                            ? "rotate-180"
                                            : ""
                                        }`}
                                      />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Views</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="px-2"
                                    onClick={() => handleSort("commentCount")}
                                  >
                                    <MessageSquare className="h-4 w-4" />
                                    {sortField === "commentCount" && (
                                      <ArrowUpDown
                                        className={`ml-2 h-3 w-3 ${
                                          sortOrder === "asc"
                                            ? "rotate-180"
                                            : ""
                                        }`}
                                      />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Comments</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                          <TableHead className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="px-2"
                                    onClick={() => handleSort("likeCount")}
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                    {sortField === "likeCount" && (
                                      <ArrowUpDown
                                        className={`ml-2 h-3 w-3 ${
                                          sortOrder === "asc"
                                            ? "rotate-180"
                                            : ""
                                        }`}
                                      />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Likes</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedDrafts?.map((article) => (
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
                            <TableCell>
                              {formatDate(
                                article.createdAt || article.created_at
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {Number(
                                article.viewCount || article.view_count || 0
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {Number(
                                article.commentCount ||
                                  article.comment_count ||
                                  article._count?.comments ||
                                  0
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {Number(
                                article.likeCount ||
                                  article.like_count ||
                                  article.likes ||
                                  article._count?.likes ||
                                  0
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {!sortedDrafts?.length && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No draft articles
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Channel Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">
                      {articles?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Articles
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {channel?.subscriberCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Subscribers
                    </div>
                  </div>
                  <div className="col-span-2 mt-3 border-t pt-3">
                    <div className="text-sm mt-2">
                      <span className="text-muted-foreground">Created by</span>{" "}
                      <Link
                        href={`/profile`}
                        className="text-primary hover:underline font-medium"
                      >
                        {ownerInfo?.username ||
                          `User #${
                            channel?.user_id || channel?.userId || "unknown"
                          }`}
                      </Link>
                    </div>
                    <div className="text-sm mt-1">
                      <span className="text-muted-foreground">
                        Creation date:
                      </span>{" "}
                      <span className="font-medium">
                        {channel && channel.created_at
                          ? formatDate(channel.created_at)
                          : "Not available"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="rounded-lg border bg-card p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Channel Settings
                  </h2>
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
      )}
    </div>
  );
}

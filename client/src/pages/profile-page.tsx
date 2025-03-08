import { useAuth } from "@/hooks/use-auth";
import { NavigationBar } from "@/components/navigation-bar";
import { Redirect, Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Channel, User } from "@shared/schema";
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
import {
  Loader2,
  Pencil,
  Check,
  Search,
  Filter,
  X,
  ArrowUpDown,
  Users,
  Calendar,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Extended User type to include created_at
type ExtendedUser = User & {
  created_at?: string | null;
  description?: string | null;
};

// Extended Channel type to include subscription info
type SubscribedChannel = Channel & {
  subscriberCount?: number;
  subscriptionDate?: string | null;
};

// Sort options
type SortField = "name" | "subscriberCount" | "subscriptionDate";
type SortDirection = "asc" | "desc";

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
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const MAX_DESCRIPTION_LENGTH = 300;
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [sortField, setSortField] = useState<SortField>("subscriptionDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Initialize all hooks first, even if user is not logged in
  // This ensures consistent hook usage regardless of auth state

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = user && (!userId || userId === user.id.toString());

  // Fetch profile data (either current user or another user)
  const { data: profileUser, isLoading: loadingProfile } =
    useQuery<ExtendedUser>({
      queryKey: ["/api/users", isOwnProfile ? user?.id : userId],
      initialData: isOwnProfile ? (user as ExtendedUser) : undefined,
      enabled: !!user && (!isOwnProfile || !!userId),
    });

  // Fetch user's subscribed channels
  const { data: subscribedChannels, isLoading: loadingSubscriptions } =
    useQuery<SubscribedChannel[]>({
      queryKey: [
        isOwnProfile
          ? "/api/user/subscriptions"
          : `/api/users/${userId}/subscriptions`,
      ],
      enabled: !!user && !!isOwnProfile, // Only fetch subscriptions for own profile when user is logged in
    });

  // Fetch all channels created by this user
  const { data: ownedChannels, isLoading: loadingOwnedChannels } = useQuery<
    Channel[]
  >({
    queryKey: ["/api/channels"],
    select: (channels) =>
      channels?.filter(
        (c) => c.userId === (isOwnProfile ? user?.id : parseInt(userId || "0"))
      ) || [],
    enabled: !!user && !!isOwnProfile, // Only fetch owned channels for own profile when user is logged in
  });

  // Initialize description state from user data when available
  useEffect(() => {
    if (profileUser?.description) {
      setDescription(profileUser.description);
    }
  }, [profileUser?.description]);

  // Update description mutation
  const updateDescriptionMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      if (!user) throw new Error("Not authenticated");

      const res = await apiRequest("PATCH", `/api/users/${user.id}`, {
        description: newDescription,
      });

      if (!res.ok) {
        throw new Error("Failed to update description");
      }

      return await res.json();
    },
    onSuccess: () => {
      if (!user) return;

      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      setIsEditingDescription(false);
      toast({
        title: "Profile updated",
        description: "Your description has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveDescription = () => {
    updateDescriptionMutation.mutate(description);
  };

  // Toggle sort direction or change sort field
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter and sort subscribed channels
  const filteredAndSortedChannels = useMemo(() => {
    if (!subscribedChannels) return [];

    // First filter by search query
    const filtered = subscribedChannels.filter((channel) => {
      return (
        !searchQuery ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    // Then sort by the selected field and direction
    return filtered.sort((a, b) => {
      let comparison = 0;

      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "subscriberCount") {
        const countA = a.subscriberCount || 0;
        const countB = b.subscriberCount || 0;
        comparison = countA - countB;
      } else if (sortField === "subscriptionDate") {
        const dateA = a.subscriptionDate
          ? new Date(a.subscriptionDate).getTime()
          : 0;
        const dateB = b.subscriptionDate
          ? new Date(b.subscriptionDate).getTime()
          : 0;
        comparison = dateA - dateB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [subscribedChannels, searchQuery, sortField, sortDirection]);

  // Now the redirect - after all hooks are defined
  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (
    loadingProfile ||
    (isOwnProfile && (loadingSubscriptions || loadingOwnedChannels))
  ) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profileUser && !isOwnProfile) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">User not found</div>
        </div>
      </div>
    );
  }

  const displayUser = profileUser || (user as ExtendedUser);

  // Add error handling
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Error Loading Profile
            </h2>
            <p className="text-red-600">{error.message}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/")}
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Profile Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{displayUser.username}</h1>
          <p className="text-muted-foreground mb-6">
            Member since{" "}
            {displayUser.created_at
              ? formatDate(displayUser.created_at)
              : "Date not available"}
          </p>

          <div className="mt-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-1">
              About
            </h2>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none"
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  placeholder="Write a short bio about yourself..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {description.length}/{MAX_DESCRIPTION_LENGTH} characters
                  </span>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDescription(displayUser.description || "");
                        setIsEditingDescription(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveDescription}
                      disabled={updateDescriptionMutation.isPending}
                    >
                      {updateDescriptionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <p className="text-base">
                  {displayUser.description || "No description provided"}
                </p>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          {/* Only show My Channels section if channels exist or just a create button */}
          {isOwnProfile && (
            <>
              {ownedChannels?.length ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>My Channels</CardTitle>
                      <CardDescription>
                        Channels you have created{" "}
                        <span className="font-medium">
                          {ownedChannels.length} out of 10
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          (max 10)
                        </span>
                      </CardDescription>
                    </div>
                    <Link href="/channels/new">
                      <Button
                        disabled={Boolean(
                          ownedChannels && ownedChannels.length >= 10
                        )}
                      >
                        Create Another Channel
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ownedChannels.map((channel) => (
                          <TableRow key={channel.id}>
                            <TableCell className="font-medium">
                              {channel.name}
                            </TableCell>
                            <TableCell className="truncate max-w-[200px]">
                              {channel.description}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/channels/${channel.id}`}>
                                <Button variant="outline" size="sm">
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex justify-center">
                  <Link href="/channels/new">
                    <Button size="lg">Create Your First Channel</Button>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Only show Subscriptions section on own profile */}
          {isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Channel Subscriptions</CardTitle>
                <CardDescription>
                  You are currently subscribed to{" "}
                  {subscribedChannels?.length || 0} channel
                  {subscribedChannels?.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!subscribedChannels?.length ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Not yet subscribed to any channels
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="Search subscribed channels..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="overflow-y-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead
                              className="w-[45%] cursor-pointer hover:bg-gray-50"
                              onClick={() => handleSort("name")}
                            >
                              <div className="flex items-center">
                                Channel Name
                                {sortField === "name" && (
                                  <ArrowUpDown
                                    className={`ml-1 h-4 w-4 ${
                                      sortDirection === "asc"
                                        ? "rotate-180"
                                        : ""
                                    }`}
                                  />
                                )}
                              </div>
                            </TableHead>
                            <TableHead className="w-[40%]">
                              Description
                            </TableHead>
                            <TableHead
                              className="w-[8%] cursor-pointer hover:bg-gray-50 text-center"
                              onClick={() => handleSort("subscriberCount")}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center">
                                      <Users className="h-4 w-4" />
                                      {sortField === "subscriberCount" && (
                                        <ArrowUpDown
                                          className={`ml-1 h-4 w-4 ${
                                            sortDirection === "asc"
                                              ? "rotate-180"
                                              : ""
                                          }`}
                                        />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Number of subscribers</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableHead>
                            <TableHead className="w-[7%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAndSortedChannels.map((channel) => (
                            <TableRow key={channel.id}>
                              <TableCell className="font-medium">
                                {channel.name}
                              </TableCell>
                              <TableCell className="truncate max-w-[200px]">
                                {channel.description}
                              </TableCell>
                              <TableCell className="text-center">
                                {channel.subscriberCount || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                <Link href={`/channels/${channel.id}`}>
                                  <Button variant="outline" size="sm">
                                    View
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {filteredAndSortedChannels.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          No channels match your filter criteria
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

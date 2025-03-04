import { useAuth } from "@/hooks/use-auth";
import { NavigationBar } from "@/components/navigation-bar";
import { Redirect, Link, useParams } from "wouter";
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
import { Loader2, Pencil, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extended User type to include created_at
type ExtendedUser = User & {
  created_at?: string | null;
  description?: string | null;
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

export default function ProfilePage() {
  const { user } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const MAX_DESCRIPTION_LENGTH = 300;

  // If not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId || userId === user.id.toString();

  // Fetch profile data (either current user or another user)
  const { data: profileUser, isLoading: loadingProfile } =
    useQuery<ExtendedUser>({
      queryKey: ["/api/users", isOwnProfile ? user.id : userId],
      initialData: isOwnProfile ? (user as ExtendedUser) : undefined,
      enabled: !isOwnProfile || !!userId,
    });

  // Initialize description state from user data when available
  useEffect(() => {
    if (profileUser?.description) {
      setDescription(profileUser.description);
    }
  }, [profileUser?.description]);

  // Fetch user's subscribed channels
  const { data: subscribedChannels, isLoading: loadingSubscriptions } =
    useQuery<Channel[]>({
      queryKey: [
        isOwnProfile
          ? "/api/user/subscriptions"
          : `/api/users/${userId}/subscriptions`,
      ],
      enabled: isOwnProfile, // Only fetch subscriptions for own profile
    });

  // Fetch all channels created by this user
  const { data: ownedChannels, isLoading: loadingOwnedChannels } = useQuery<
    Channel[]
  >({
    queryKey: ["/api/channels"],
    select: (channels) =>
      channels.filter(
        (c) => c.userId === (isOwnProfile ? user.id : parseInt(userId || "0"))
      ),
    enabled: isOwnProfile, // Only fetch owned channels for own profile
  });

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
          {/* Only show My Channels section on own profile */}
          {isOwnProfile && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Channels</CardTitle>
                  <CardDescription>
                    Channels you have created{" "}
                    <span className="font-medium">
                      {ownedChannels?.length || 0} out of 10
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
                {!ownedChannels?.length ? (
                  <div className="text-center py-4 text-muted-foreground">
                    You haven't created any channels yet
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          )}

          {/* Only show Subscriptions section on own profile */}
          {isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Channel Subscriptions</CardTitle>
                <CardDescription>Channels you're subscribed to</CardDescription>
              </CardHeader>
              <CardContent>
                {!subscribedChannels?.length ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Not yet subscribed to any channels
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscribedChannels.map((channel) => (
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
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

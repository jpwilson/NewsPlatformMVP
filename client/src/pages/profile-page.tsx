import { useAuth } from "@/hooks/use-auth";
import { NavigationBar } from "@/components/navigation-bar";
import { Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";

// Extended User type to include created_at
type ExtendedUser = User & {
  created_at?: string | null;
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

  // If not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Fetch user's subscribed channels
  const { data: subscribedChannels, isLoading: loadingSubscriptions } =
    useQuery<Channel[]>({
      queryKey: ["/api/user/subscriptions"],
    });

  // Fetch all channels created by this user
  const { data: ownedChannels, isLoading: loadingOwnedChannels } = useQuery<
    Channel[]
  >({
    queryKey: ["/api/channels"],
    select: (channels) => channels.filter((c) => c.userId === user.id),
  });

  if (loadingSubscriptions || loadingOwnedChannels) {
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
            <Button>Create Channel</Button>
          </Link>
        </div>

        <div className="grid gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Username
                  </span>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Member Since
                  </span>
                  <span className="font-medium">
                    {(user as any).created_at
                      ? formatDate((user as any).created_at)
                      : "Date not available"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">
                    Channels Created
                  </span>
                  <span className="font-medium">
                    {ownedChannels?.length || 0}
                  </span>
                </div>
                {/* Would add more user info here when available */}
              </div>
            </CardContent>
          </Card>

          {/* My Channels Card */}
          <Card>
            <CardHeader>
              <CardTitle>My Channels</CardTitle>
              <CardDescription>Channels you have created</CardDescription>
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

          {/* Subscriptions Card */}
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
        </div>
      </div>
    </div>
  );
}

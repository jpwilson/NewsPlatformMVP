import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Newspaper, LogOut, ChevronDown, PlusCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@shared/schema";
import { useEffect } from "react";

export function NavigationBar({
  hideAuthButtons = false,
  selectedChannelId = undefined,
}: {
  hideAuthButtons?: boolean;
  selectedChannelId?: string | number;
}) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    console.log("NavigationBar - Selected Channel ID:", selectedChannelId);
  }, [selectedChannelId]);

  // Fetch user's owned channels if the user is logged in
  const { data: userChannels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    select: (channels) => channels?.filter((c) => c.userId === user?.id) || [],
    enabled: !!user,
  });

  useEffect(() => {
    if (userChannels) {
      console.log(
        "NavigationBar - User Channels:",
        userChannels.map((c) => ({ id: c.id, name: c.name }))
      );
    }
  }, [userChannels]);

  // Get the selected channel or default to the first one
  const selectedChannel =
    userChannels && selectedChannelId
      ? userChannels.find(
          (c) => c.id.toString() === selectedChannelId.toString()
        )
      : null;

  // Get the user's primary channel (first one they created)
  const primaryChannel =
    selectedChannel ||
    (userChannels && userChannels.length > 0 ? userChannels[0] : null);

  const hasMultipleChannels = userChannels && userChannels.length > 1;

  useEffect(() => {
    console.log("NavigationBar - Selected Channel:", selectedChannel);
    console.log("NavigationBar - Displayed Channel:", primaryChannel);
  }, [selectedChannel, primaryChannel]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navigateToChannel = (channelId: number) => {
    console.log("NavigationBar - Navigating to channel:", channelId);
    setLocation(`/channels/${channelId}`);
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Newspaper className="h-6 w-6" />
          <span className="font-bold text-lg">NewsPlatform</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Show channel info if user has created at least one channel */}
          {primaryChannel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-muted-foreground hidden md:flex items-center gap-1"
                >
                  Channel:{" "}
                  <span className="font-medium">{primaryChannel.name}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* List all user channels */}
                {userChannels &&
                  userChannels.map((channel) => (
                    <DropdownMenuItem
                      key={channel.id}
                      onClick={() => navigateToChannel(channel.id)}
                      className={
                        channel.id ===
                        (selectedChannelId
                          ? Number(selectedChannelId)
                          : primaryChannel.id)
                          ? "font-medium"
                          : ""
                      }
                    >
                      {channel.name}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/channels/new" className="flex items-center">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Channel
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <nav>
            {!hideAuthButtons &&
              (user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 bg-background"
                    >
                      {user.username}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button size="sm">Login</Button>
                </Link>
              ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

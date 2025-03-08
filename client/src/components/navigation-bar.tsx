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
import {
  Newspaper,
  LogOut,
  ChevronDown,
  PlusCircle,
  Menu,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@shared/schema";
import { useEffect } from "react";
import { useSelectedChannel } from "@/hooks/use-selected-channel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NavigationBar({
  hideAuthButtons = false,
  selectedChannelId = undefined,
}: {
  hideAuthButtons?: boolean;
  selectedChannelId?: string | number;
}) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const { selectedChannelId: contextChannelId, setSelectedChannelId } =
    useSelectedChannel();

  // Get popular channels for mobile menu
  const { data: popularChannels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    enabled: true,
  });

  // Use the prop value if provided (for explicit page-level control), otherwise use the context value
  const effectiveChannelId =
    selectedChannelId !== undefined
      ? Number(selectedChannelId)
      : contextChannelId;

  useEffect(() => {
    console.log(
      "NavigationBar - Selected Channel ID from prop:",
      selectedChannelId
    );
    console.log(
      "NavigationBar - Selected Channel ID from context:",
      contextChannelId
    );
    console.log("NavigationBar - Effective Channel ID:", effectiveChannelId);
  }, [selectedChannelId, contextChannelId, effectiveChannelId]);

  // When selectedChannelId prop changes and it's defined, update the context
  useEffect(() => {
    if (selectedChannelId !== undefined) {
      setSelectedChannelId(Number(selectedChannelId));
    }
  }, [selectedChannelId, setSelectedChannelId]);

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
    userChannels && effectiveChannelId
      ? userChannels.find((c) => c.id === effectiveChannelId)
      : null;

  // Get the user's primary channel (first one they created)
  const displayedChannel =
    selectedChannel ||
    (userChannels && userChannels.length > 0 ? userChannels[0] : null);

  const hasMultipleChannels = userChannels && userChannels.length > 1;

  useEffect(() => {
    console.log("NavigationBar - Selected Channel:", selectedChannel);
    console.log("NavigationBar - Displayed Channel:", displayedChannel);
  }, [selectedChannel, displayedChannel]);

  const handleLogout = () => {
    logoutMutation.mutate();
    // Force redirect to the home page after logout
    setLocation("/");
  };

  const navigateToChannel = (channelId: number) => {
    console.log("NavigationBar - Navigating to channel:", channelId);
    setSelectedChannelId(channelId);
    setLocation(`/channels/${channelId}`);
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Hamburger menu for mobile */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="py-4">
                <div className="pb-4">
                  <Link href="/" className="flex items-center gap-2 py-2">
                    <Newspaper className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                </div>

                {user && (
                  <div className="pb-4">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 py-2"
                    >
                      <span>Profile</span>
                    </Link>
                  </div>
                )}

                {/* Display channel info in mobile menu if user has a channel */}
                {displayedChannel && (
                  <div className="pb-4">
                    <div className="flex items-center gap-2 py-2">
                      <span>
                        Channel:{" "}
                        <span className="font-medium">
                          {displayedChannel.name}
                        </span>
                      </span>
                    </div>
                    {hasMultipleChannels && (
                      <div className="pl-7 space-y-2 mt-1">
                        {userChannels?.map((channel) => (
                          <div
                            key={channel.id}
                            className={`text-sm py-1 cursor-pointer ${
                              channel.id === effectiveChannelId
                                ? "font-medium"
                                : ""
                            }`}
                            onClick={() => navigateToChannel(channel.id)}
                          >
                            {channel.name}
                          </div>
                        ))}
                        <Link
                          href="/channels/new"
                          className="text-sm py-1 flex items-center gap-1 text-primary"
                        >
                          <PlusCircle className="h-3 w-3" />
                          Create Channel
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Popular Channels Section for Mobile */}
                <div className="pt-4 border-t">
                  <h3 className="font-medium flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5" />
                    Popular Channels
                  </h3>
                  <div className="pl-7 space-y-2">
                    {popularChannels?.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No channels available
                      </p>
                    ) : (
                      <>
                        {popularChannels?.slice(0, 5).map((channel) => (
                          <Link
                            key={channel.id}
                            href={`/channels/${channel.id}`}
                            className="block py-1 text-sm"
                          >
                            {channel.name}
                          </Link>
                        ))}
                        <Link
                          href="/channels"
                          className="block py-1 text-sm font-medium text-primary"
                        >
                          Browse All Channels
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Newspaper className="h-6 w-6" />
            <span className="font-bold text-lg">NewsPlatform</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Show channel info if user has created at least one channel */}
          {displayedChannel && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-muted-foreground hidden md:flex items-center gap-1"
                >
                  Channel:{" "}
                  <span className="font-medium">{displayedChannel.name}</span>
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
                        channel.id === effectiveChannelId ? "font-medium" : ""
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

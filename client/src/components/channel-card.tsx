import { Channel } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { AuthDialog } from "./auth-dialog";

// Extended Channel type that includes subscriberCount
type ExtendedChannel = Channel & {
  subscriberCount?: number;
  subscriber_count?: number;
};

export function ChannelCard({ channel }: { channel: ExtendedChannel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/channels/${channel.id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channel.id}`],
      });
      toast({
        title: "Subscribed",
        description: `You are now subscribed to ${channel.name}`,
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/channels/${channel.id}/subscribe`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/channels/${channel.id}`],
      });
      toast({
        title: "Unsubscribed",
        description: `You have unsubscribed from ${channel.name}`,
      });
    },
  });

  const handleCardClick = () => {
    if (user) {
      navigate(`/channels/${channel.id}`);
    } else {
      setAuthDialogOpen(true);
    }
  };

  const handleSubscribe = () => {
    if (user) {
      subscribeMutation.mutate();
    } else {
      setAuthDialogOpen(true);
    }
  };

  // Get subscriber count from multiple possible properties
  const getSubscriberCount = () => {
    return channel.subscriberCount ?? channel.subscriber_count ?? 0;
  };

  return (
    <>
      <Card
        className="mb-4 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{channel.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">{getSubscriberCount()}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {channel.description && (
            <p className="text-sm text-muted-foreground mb-4">
              {channel.description}
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click event
              handleSubscribe();
            }}
            disabled={
              user && user.id !== channel.userId
                ? subscribeMutation.isPending || unsubscribeMutation.isPending
                : false
            }
          >
            Subscribe
          </Button>
        </CardContent>
      </Card>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </>
  );
}

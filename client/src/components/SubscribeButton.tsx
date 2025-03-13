import { Button } from "./ui/button";
import { useState } from "react";
import { useMutation, useQueryClient } from "react-query";
import { apiRequest } from "@/lib/apiRequest";
import { useToast } from "./ui/use-toast";

interface SubscribeButtonProps {
  channelId: number;
  isSubscribed: boolean;
  disabled?: boolean;
}

export default function SubscribeButton({
  channelId,
  isSubscribed,
  disabled = false,
}: SubscribeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Log the subscription status for debugging
  console.log(
    `Subscribe button for channel ${channelId} - isSubscribed: ${isSubscribed}`
  );

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const res = await apiRequest(
        "POST",
        `/api/channels/${channelId}/subscribe`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to subscribe");
      }

      const data = await res.json();
      console.log("Subscribe response:", data);
      return data;
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: "Subscribed!",
        description: "You have successfully subscribed to this channel.",
      });
      queryClient.invalidateQueries(["/api/user/subscriptions"]);
      queryClient.invalidateQueries([`/api/channels/${channelId}`]);
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast({
        title: "Subscription failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      setIsLoading(true);
      const res = await apiRequest(
        "DELETE",
        `/api/channels/${channelId}/subscribe`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to unsubscribe");
      }

      const data = await res.json();
      console.log("Unsubscribe response:", data);
      return data;
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: "Unsubscribed",
        description: "You have successfully unsubscribed from this channel.",
      });
      queryClient.invalidateQueries(["/api/user/subscriptions"]);
      queryClient.invalidateQueries([`/api/channels/${channelId}`]);
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast({
        title: "Unsubscription failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribeMutation.mutate();
    } else {
      subscribeMutation.mutate();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={isSubscribed ? "outline" : "default"}
      size="sm"
      disabled={disabled || isLoading}
      className="w-full"
    >
      {isLoading ? "Loading..." : isSubscribed ? "Unsubscribe" : "Subscribe"}
    </Button>
  );
}

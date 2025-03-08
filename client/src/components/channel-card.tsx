import { Channel } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Users } from "lucide-react";

export function ChannelCard({ channel }: { channel: Channel }) {
  const { user } = useAuth();
  const { toast } = useToast();

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

  return (
    <Card className="mb-4">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{channel.name}</h3>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        {channel.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {channel.description}
          </p>
        )}

        {user && user.id !== channel.userId && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => subscribeMutation.mutate()}
            disabled={
              subscribeMutation.isPending || unsubscribeMutation.isPending
            }
          >
            Subscribe
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

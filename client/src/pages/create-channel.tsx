import { useForm } from "react-hook-form";
import { insertChannelSchema, type InsertChannel } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Channel } from "@shared/schema";

export default function CreateChannel() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Fetch user's existing channels to check against limit
  const { data: userChannels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    select: (channels) => channels.filter((c) => c.userId === user?.id),
    enabled: !!user,
  });

  const remainingChannels = userChannels ? 10 - userChannels.length : 10;
  const isAtLimit = remainingChannels <= 0;

  const form = useForm<InsertChannel>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createChannelMutation = useMutation({
    mutationFn: async (data: InsertChannel) => {
      console.log("Making API request with data:", data);
      const response = await apiRequest("POST", "/api/channels", data);
      if (!response.ok) {
        const error = await response.json();
        console.error("API error:", error);
        throw new Error(error.message || "Failed to create channel");
      }
      return await response.json();
    },
    onSuccess: () => {
      console.log("Channel created successfully");
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Channel created!",
        description: "Your channel has been created successfully.",
      });
      // Immediate navigation after success
      window.location.href = "/articles/new";
    },
    onError: (error: Error) => {
      console.error("Creation failed:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertChannel) => {
    try {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a channel",
          variant: "destructive",
        });
        return;
      }

      const channelData = {
        ...data,
        userId: user.id,
      };

      console.log("Submitting channel data:", channelData);
      await createChannelMutation.mutateAsync(channelData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      <div className="container mx-auto p-4 lg:p-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Create Channel</h1>

        {userChannels && (
          <div
            className={`mb-6 p-4 rounded-md ${
              isAtLimit
                ? "bg-destructive/15"
                : remainingChannels <= 2
                ? "bg-amber-500/15"
                : ""
            }`}
          >
            <p className="text-sm">
              {isAtLimit
                ? "You've reached the maximum limit of 10 channels. Please delete an existing channel before creating a new one."
                : `You can create ${remainingChannels} more channel${
                    remainingChannels === 1 ? "" : "s"
                  } (limit: 10).`}
            </p>
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={createChannelMutation.isPending || isAtLimit}
            >
              {createChannelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

import { useForm } from "react-hook-form";
import { insertChannelSchema, type InsertChannel } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation, Redirect } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function CreateChannel() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const form = useForm<InsertChannel>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: InsertChannel) => {
    console.log("Form submitted with data:", data);
    if (!user) {
      console.error("No user found");
      toast({
        title: "Error",
        description: "You must be logged in to create a channel",
        variant: "destructive",
      });
      return;
    }

    const channelData = {
      ...data,
      userId: user.id
    };
    console.log("Submitting channel with data:", channelData);
    await createChannelMutation.mutate(channelData);
  };

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
    onSuccess: (channel) => {
      console.log("Channel created:", channel);
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Channel created!",
        description: "Your channel has been created successfully.",
      });
      // Remove setTimeout and directly navigate
      console.log("Current location:", location);
      console.log("Navigating to /articles/new");
      setLocation("/articles/new");
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

  // Add redirect check
  if (createChannelMutation.isSuccess) {
    console.log("Mutation succeeded, redirecting");
    return <Redirect to="/articles/new" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      <div className="container mx-auto p-4 lg:p-8 max-w-2xl">
        <h1 className="text-4xl font-bold mb-8">Create Channel</h1>

        <Form {...form}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submitted!");
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
              disabled={createChannelMutation.isPending}
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
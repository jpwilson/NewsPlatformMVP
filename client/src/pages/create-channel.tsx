import { useForm } from "react-hook-form";
import { insertChannelSchema, type InsertChannel } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export default function CreateChannel() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Simplified form with just required fields
  const form = useForm<InsertChannel>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Explicit button click handler
  const handleClick = () => {
    console.log("Button clicked!");
    console.log("Current form values:", form.getValues());
  };

  // Simple form submission
  const onSubmit = async (data: InsertChannel) => {
    console.log("Form submitted with data:", data);
    const channelData = {
      ...data,
      userId: user?.id
    };
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

  // Simplified render with just the basic form
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
              onClick={handleClick}
              className="w-full"
            >
              Create Channel
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
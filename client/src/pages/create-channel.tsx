import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChannelSchema, type InsertChannel } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Redirect } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const CHANNEL_CATEGORIES = [
  "News",
  "Technology",
  "Science",
  "Health",
  "Entertainment",
  "Sports",
  "Business",
  "Politics",
  "Education",
  "Other"
];

export default function CreateChannel() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Form setup with required fields
  const form = useForm<InsertChannel>({
    resolver: zodResolver(
      insertChannelSchema.extend({
        name: insertChannelSchema.shape.name,
        description: insertChannelSchema.shape.description,
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      location: "",
      bannerImage: undefined,
      profileImage: undefined,
    },
  });

  // Explicitly handle the submit button click
  const handleButtonClick = (event: React.MouseEvent) => {
    console.log("Create Channel button clicked");
    // Don't prevent default - let the form handle submission
  };

  // Handle form submission
  const onSubmit = async (data: InsertChannel) => {
    console.log("Form submission handler called with data:", data);
    try {
      const channelData = {
        ...data,
        userId: user?.id
      };
      console.log("Submitting channel data:", channelData);
      await createChannelMutation.mutate(channelData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const createChannelMutation = useMutation({
    mutationFn: async (data: InsertChannel) => {
      console.log("Mutation starting with data:", data);
      const response = await apiRequest("POST", "/api/channels", data);

      if (!response.ok) {
        const error = await response.json();
        console.error("API error:", error);
        throw new Error(error.message || "Failed to create channel");
      }

      return await response.json();
    },
    onSuccess: (channel) => {
      console.log("Channel created successfully:", channel);
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Channel created",
        description: "You can now start writing articles.",
      });
      setLocation("/articles/new");
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Failed to create channel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      <div className="container mx-auto p-4 lg:p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Your Channel</h1>
          <p className="text-lg text-muted-foreground">
            Before writing your first article, let's set up your channel where your content will be published.
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              console.log("Form submit event triggered");
              e.preventDefault();
              const isValid = form.formState.isValid;
              console.log("Form validation state:", isValid);
              console.log("Form validation errors:", form.formState.errors);

              if (isValid) {
                form.handleSubmit(onSubmit)(e);
              } else {
                console.log("Form validation failed");
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your channel name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is how your channel will appear to readers.
                    </FormDescription>
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
                      <Textarea
                        placeholder="Tell readers what your channel is about..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A brief description of your channel's focus and content.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="appearance">
                <AccordionTrigger>Channel Appearance</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="bannerImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banner Image (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter banner image URL"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a URL for your banner image (1500x500 pixels recommended)
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter profile image URL"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a URL for your profile image (square, 400x400 pixels minimum)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details">
                <AccordionTrigger>Additional Details</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category (Optional)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CHANNEL_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., New York, USA"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex items-center justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation("/")}
                disabled={createChannelMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createChannelMutation.isPending}
                onClick={handleButtonClick}
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
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
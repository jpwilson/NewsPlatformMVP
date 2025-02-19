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
import { useLocation } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Loader2 } from "lucide-react";
import React from 'react';

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

  console.log('CreateChannel component rendered'); // Component mounting check

  const form = useForm<InsertChannel>({
    resolver: zodResolver(insertChannelSchema),
    defaultValues: {
      name: "",
      description: "",
      category: undefined,
      location: "",
    },
    onChange: (data) => {
      console.log('Form data changed:', data); // Monitor form data changes
    },
  });

  // Log validation errors whenever they change
  React.useEffect(() => {
    console.log('Form validation errors:', form.formState.errors);
  }, [form.formState.errors]);

  const createChannelMutation = useMutation({
    mutationFn: async (data: InsertChannel) => {
      console.log('Mutation started with data:', data); // Verify mutation trigger
      try {
        const res = await apiRequest("POST", "/api/channels", data);
        const json = await res.json();
        console.log('Server response:', json);
        if (!res.ok) throw new Error(json.message || "Failed to create channel");
        return json;
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      }
    },
    onSuccess: (channel) => {
      console.log('Mutation succeeded:', channel);
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
      toast({
        title: "Channel created",
        description: "You can now start writing articles.",
      });
      setLocation("/articles/new");
    },
    onError: (error: Error) => {
      console.error('Mutation error handler:', error);
      toast({
        title: "Failed to create channel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Keep the form submission handler separate to debug the flow
  const onSubmit = async (data: InsertChannel) => {
    console.log('Form submitted with data:', data);
    console.log('Current user:', user); // Assumes 'user' is available in scope
    const channelData = {
      ...data,
      userId: user?.id // Add userId from user object
    };
    console.log('Modified channel data:', channelData);
    createChannelMutation.mutate(channelData);
  };

  // Log when the submit button is clicked
  const handleSubmitClick = () => {
    console.log('Submit button clicked');
    console.log('Current form state:', {
      isDirty: form.formState.isDirty,
      isValid: form.formState.isValid,
      isSubmitting: form.formState.isSubmitting,
      errors: form.formState.errors
    });
  };

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
              console.log('Raw form submission event:', e);
              form.handleSubmit(onSubmit)(e);
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
                        <FormLabel>Banner Image</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) field.onChange(file);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Recommended size: 1500x500 pixels
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="profileImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) field.onChange(file);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Square image, at least 400x400 pixels
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
                onClick={handleSubmitClick}
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
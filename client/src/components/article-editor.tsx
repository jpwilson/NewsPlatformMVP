import { useForm } from "react-hook-form";
import {
  insertArticleSchema,
  type InsertArticle,
  Channel,
} from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define extended types for hierarchical structures
interface CategoryWithChildren {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string | null;
  children?: CategoryWithChildren[];
}

interface LocationWithChildren {
  id: number;
  name: string;
  parent_id: number | null;
  type: string;
  created_at: string | null;
  children?: LocationWithChildren[];
}

export function ArticleEditor({ channels }: { channels: Channel[] }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isDraft, setIsDraft] = useState(false);

  // Fetch categories from API
  const { data: categories, isLoading: isLoadingCategories } = useQuery<
    CategoryWithChildren[]
  >({
    queryKey: ["/api/categories"],
  });

  // Fetch locations from API
  const { data: locations, isLoading: isLoadingLocations } = useQuery<
    LocationWithChildren[]
  >({
    queryKey: ["/api/locations"],
  });

  const form = useForm<InsertArticle>({
    defaultValues: {
      title: "",
      content: "",
      channelId: undefined,
      category: "Other", // Default category text (required by schema)
      location: "",
      locationId: undefined,
      categoryId: undefined,
      published: true,
      status: isDraft ? "draft" : "published",
    },
    resolver: zodResolver(
      z.object({
        title: z.string().min(1, "Title is required"),
        content: z.string().min(1, "Content is required"),
        channelId: z.number({ required_error: "Please select a channel" }),
        // Other fields can remain optional or have their own validation
        categoryId: z.any().optional(),
        locationId: z.any().optional(),
        category: z.string().optional(),
        location: z.string().optional(),
        published: z.boolean().optional(),
        status: z.string().optional(),
      })
    ),
  });

  // Update status when isDraft changes
  useEffect(() => {
    form.setValue("status", isDraft ? "draft" : "published");
    form.setValue("published", !isDraft);
  }, [isDraft, form]);

  // Set default channelId when channels are loaded
  useEffect(() => {
    if (channels && channels.length > 0 && !form.getValues("channelId")) {
      form.setValue("channelId", channels[0].id);
    }
  }, [channels, form]);

  // Handle form submission
  const onSubmit = async (data: InsertArticle) => {
    console.log("Form submitted with data:", data);
    if (!user) {
      console.error("No user found");
      toast({
        title: "Error",
        description: "You must be logged in to create an article",
        variant: "destructive",
      });
      return;
    }

    // Validate that channel is selected
    if (!data.channelId) {
      toast({
        title: "Error",
        description: "Please select a channel for this article",
        variant: "destructive",
      });
      return;
    }

    // Process special values for categoryId and locationId
    const processedData = {
      ...data,
      userId: user.id,
      channelId: data.channelId, // Ensure channelId is included
      categoryId:
        data.categoryId &&
        typeof data.categoryId === "string" &&
        (data.categoryId === "no-categories" ||
          isNaN(parseInt(data.categoryId)))
          ? undefined
          : data.categoryId,
      locationId:
        data.locationId &&
        typeof data.locationId === "string" &&
        (data.locationId === "no-location" ||
          data.locationId === "no-locations" ||
          isNaN(parseInt(data.locationId)))
          ? undefined
          : data.locationId,
    };

    console.log("Submitting article with data:", processedData);
    await createArticleMutation.mutate(processedData);
  };

  const createArticleMutation = useMutation({
    mutationFn: async (data: InsertArticle) => {
      console.log("Making API request with data:", data);
      const res = await apiRequest("POST", "/api/articles", data);
      if (!res.ok) {
        const error = await res.json();
        console.error("API error:", error);
        throw new Error(error.message || "Failed to create article");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate the articles query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });

      toast({
        title: "Success",
        description: isDraft
          ? "Article saved as draft"
          : "Article published successfully",
      });

      // Navigate to the individual article page instead of the listing page
      setTimeout(() => {
        window.location.href = `/articles/${data.id}`;
      }, 1500);
    },
    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create article",
        variant: "destructive",
      });
    },
  });

  // Helper function to render nested categories
  const renderCategoryOptions = (
    categoryList: CategoryWithChildren[] = [],
    level = 0
  ): JSX.Element[] => {
    return categoryList.map((category) => (
      <React.Fragment key={category.id}>
        <SelectItem
          value={category.id.toString()}
          className={`pl-${level * 4}`}
        >
          {level > 0 && <span className="mr-2">↳</span>}
          {category.name}
        </SelectItem>
        {category.children &&
          category.children.length > 0 &&
          renderCategoryOptions(category.children, level + 1)}
      </React.Fragment>
    ));
  };

  // Helper function to render location dropdown options
  const renderLocationOptions = (
    locationList: LocationWithChildren[] = [],
    level = 0
  ): JSX.Element[] => {
    return locationList.map((location) => (
      <React.Fragment key={location.id}>
        <SelectItem
          value={location.id.toString()}
          className={`pl-${level * 4}`}
        >
          {level > 0 && <span className="mr-2">↳</span>}
          {location.name}{" "}
          {location.type && (
            <span className="text-muted-foreground">({location.type})</span>
          )}
        </SelectItem>
        {location.children &&
          location.children.length > 0 &&
          renderLocationOptions(location.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Article title" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="channelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel</FormLabel>
              {channels && channels.length > 0 ? (
                <Select
                  value={field.value?.toString() || ""}
                  onValueChange={(value) => {
                    if (value) {
                      field.onChange(parseInt(value));
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem
                        key={channel.id}
                        value={channel.id.toString()}
                      >
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-red-500 text-sm">
                  No channels available. Please create a channel first.
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  value={field.value?.toString() || ""}
                  onValueChange={(value) => {
                    field.onChange(value ? parseInt(value) : undefined);

                    // Also set the text category field for backwards compatibility
                    if (value && categories) {
                      const selectedCategory =
                        categories.find((c) => c.id.toString() === value) ||
                        categories
                          .flatMap((c) => c.children || [])
                          .find((c) => c.id.toString() === value);

                      if (selectedCategory) {
                        form.setValue("category", selectedCategory.name);
                      }
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-80">
                    {isLoadingCategories ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading categories...
                      </div>
                    ) : categories ? (
                      renderCategoryOptions(categories)
                    ) : (
                      <SelectItem value="no-categories">
                        No categories available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location (optional)</FormLabel>
                <Select
                  value={field.value?.toString() || ""}
                  onValueChange={(value) =>
                    field.onChange(value ? parseInt(value) : undefined)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-80">
                    <SelectItem value="no-location">
                      No specific location
                    </SelectItem>
                    {isLoadingLocations ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading locations...
                      </div>
                    ) : locations ? (
                      renderLocationOptions(locations)
                    ) : (
                      <SelectItem value="no-locations">
                        No locations available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select a location to help readers find geographically relevant
                  content
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your article content here..."
                  className="min-h-[400px]"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center space-x-2 mb-4">
          <Switch
            id="draft-mode"
            checked={isDraft}
            onCheckedChange={setIsDraft}
          />
          <Label htmlFor="draft-mode">Save as draft</Label>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createArticleMutation.isPending}
        >
          {createArticleMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isDraft ? "Saving..." : "Publishing..."}
            </>
          ) : isDraft ? (
            "Save Draft"
          ) : (
            "Publish Article"
          )}
        </Button>
      </form>
    </Form>
  );
}

import { useForm } from "react-hook-form";
import { insertArticleSchema, type InsertArticle, Channel } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react"; // Fixed import

const CATEGORIES = [
  "Politics",
  "Technology",
  "Science",
  "Health",
  "Entertainment",
  "Sports",
  "Business",
  "Other"
];

export function ArticleEditor({ channels }: { channels: Channel[] }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<InsertArticle>({
    defaultValues: {
      title: "",
      content: "",
      channelId: undefined,
      category: "Other",
      location: "",
      published: true,
    },
  });

  // Explicit button click handler for debugging
  const handleClick = () => {
    console.log("Publish button clicked!");
    console.log("Current form values:", form.getValues());
  };

  // Handle form submission
  const onSubmit = async (data: InsertArticle) => {
    console.log("Form submitted with data:", data);
    await createArticleMutation.mutate(data);
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
      return await res.json();
    },
    onSuccess: (article) => {
      console.log("Article created successfully:", article);
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "Article created",
        description: "Your article has been published successfully.",
      });
      console.log("Redirecting to article page:", `/articles/${article.id}`);
      setLocation(`/articles/${article.id}`);
    },
    onError: (error: Error) => {
      console.error("Creation failed:", error);
      toast({
        title: "Failed to create article",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
              <Select
                value={field.value?.toString()}
                onValueChange={(value) => field.onChange(parseInt(value))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id.toString()}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
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
                <FormLabel>Location (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., New York, USA" {...field} />
                </FormControl>
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

        <Button
          type="submit"
          className="w-full"
          disabled={createArticleMutation.isPending}
          onClick={handleClick}
        >
          {createArticleMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Article"
          )}
        </Button>
      </form>
    </Form>
  );
}
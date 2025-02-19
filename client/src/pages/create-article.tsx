import { NavigationBar } from "@/components/navigation-bar";
import { ArticleEditor } from "@/components/article-editor";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function CreateArticle() {
  const { user } = useAuth();
  
  const { data: channels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    select: (channels) => channels.filter((c) => c.userId === user?.id),
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <div className="container mx-auto p-4 lg:p-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Create Article</h1>
        <ArticleEditor channels={channels || []} />
      </div>
    </div>
  );
}

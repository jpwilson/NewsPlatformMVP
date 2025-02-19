import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import { NavigationBar } from "@/components/navigation-bar";
import { CommentSection } from "@/components/comment-section";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: article, isLoading } = useQuery<Article>({
    queryKey: [`/api/articles/${id}`],
  });

  const handleReaction = async (isLike: boolean) => {
    await apiRequest("POST", `/api/articles/${id}/reactions`, { isLike });
    queryClient.invalidateQueries({ queryKey: [`/api/articles/${id}`] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto p-4 lg:p-8">
          <div className="text-center">Article not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <article className="container mx-auto p-4 lg:p-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>
              {new Date(article.createdAt).toLocaleDateString()}
            </span>
            {article.location && <span>📍 {article.location}</span>}
            <span>📂 {article.category}</span>
          </div>
        </header>

        <div 
          className="prose prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReaction(true)}
            disabled={!user}
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Like
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleReaction(false)}
            disabled={!user}
          >
            <ThumbsDown className="h-4 w-4 mr-2" />
            Dislike
          </Button>
        </div>

        <CommentSection articleId={article.id} />
      </article>
    </div>
  );
}

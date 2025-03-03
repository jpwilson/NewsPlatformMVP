import { useQuery } from "@tanstack/react-query";
import { Article } from "@shared/schema";
import { NavigationBar } from "@/components/navigation-bar";
import { CommentSection } from "@/components/comment-section";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Eye,
  MessageSquare,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/date-utils";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Define a more flexible type for article that accommodates both camelCase and snake_case
type ArticleWithSnakeCase = Article & {
  created_at?: string | Date;
  channel_id?: number;
  channel?: { id: number; name: string };
  likes?: number;
  dislikes?: number;
  viewCount?: number;
  userReaction?: boolean | null;
  _count?: {
    comments?: number;
  };
};

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const { data: article, isLoading } = useQuery<ArticleWithSnakeCase>({
    queryKey: [`/api/articles/${id}`],
  });

  // Increment view count when the article is loaded
  useEffect(() => {
    if (id && !isLoading && article) {
      apiRequest("POST", `/api/articles/${id}/view`, {})
        .then((response) => response.json())
        .then((data) => {
          if (data.counted) {
            // Invalidate the article query to refresh the view count
            queryClient.invalidateQueries({
              queryKey: [`/api/articles/${id}`],
            });
          }
          if (data.counted === false && data.message) {
            console.log(data.message); // We could show this to the user in a more sophisticated UI
          }
        })
        .catch((err) => console.error("Failed to increment view count:", err));
    }
  }, [id, isLoading, article]);

  const handleReaction = async (isLike: boolean) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    await apiRequest("POST", `/api/articles/${id}/reactions`, { isLike });
    queryClient.invalidateQueries({ queryKey: [`/api/articles/${id}`] });
  };

  const handleChannelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthDialog(true);
    } else {
      // Use either channelId or channel_id, checking for existence
      const channelId = article?.channel_id || article?.channelId;
      // Only navigate if channelId exists
      if (channelId) {
        setLocation(`/channels/${channelId}`);
      } else {
        console.error("No channel ID found for this article");
      }
    }
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

  // Use 0 as default if metrics are undefined
  const likes = article.likes || 0;
  const dislikes = article.dislikes || 0;
  const views = article.viewCount || 0;
  const commentCount = article._count?.comments || 0;

  // Check if user has liked or disliked
  const userLiked = article.userReaction === true;
  const userDisliked = article.userReaction === false;

  return (
    <>
      <div className="min-h-screen bg-background">
        <NavigationBar />

        <article className="container mx-auto p-4 lg:p-8 max-w-4xl">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>
                  {formatDate(article.created_at || article.createdAt)}
                </span>
                {article.location && <span>📍 {article.location}</span>}
                <span>📂 {article.category}</span>
              </div>
              <button
                onClick={handleChannelClick}
                className="text-primary hover:underline w-fit"
              >
                By: {article.channel?.name || "Unknown Channel"}
              </button>

              {/* Article metrics */}
              <div className="flex items-center gap-5 mt-2">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="text-sm">{views} views</span>
                </div>

                <div className="flex items-center">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  <span className="text-sm">{likes} likes</span>
                </div>

                <div className="flex items-center">
                  <ThumbsDown className="h-4 w-4 mr-1" />
                  <span className="text-sm">{dislikes} dislikes</span>
                </div>

                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  <span className="text-sm">{commentCount} comments</span>
                </div>
              </div>
            </div>
          </header>

          <div
            className="prose prose-lg max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Interactive like/dislike buttons at the bottom */}
          <div className="flex items-center gap-4 mb-8 border-t pt-4">
            <div className="text-lg font-medium mr-2">What did you think?</div>
            <Button
              variant={userLiked ? "default" : "outline"}
              size="sm"
              onClick={() => handleReaction(true)}
              className={cn(userLiked && "bg-green-600 hover:bg-green-700")}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Like {likes > 0 && <span className="ml-1">({likes})</span>}
            </Button>
            <Button
              variant={userDisliked ? "default" : "outline"}
              size="sm"
              onClick={() => handleReaction(false)}
              className={cn(userDisliked && "bg-red-600 hover:bg-red-700")}
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              Dislike{" "}
              {dislikes > 0 && <span className="ml-1">({dislikes})</span>}
            </Button>
          </div>

          <CommentSection articleId={article.id} />
        </article>
      </div>

      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Authentication Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be logged in to{" "}
              {id ? "like or dislike articles" : "view channel details"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAuthDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={() => setLocation("/auth")}>Sign In</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

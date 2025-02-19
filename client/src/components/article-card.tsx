import { Article } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export function ArticleCard({ article }: { article: Article }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handleChannelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthDialog(true);
    } else {
      setLocation(`/channels/${article.channelId}`);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href={`/articles/${article.id}`}>
                <h3 className="text-xl font-semibold hover:underline cursor-pointer">
                  {article.title}
                </h3>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                {article.location && <span>📍 {article.location}</span>}
                <span>📂 {article.category}</span>
                <button
                  onClick={handleChannelClick}
                  className="text-primary hover:underline"
                >
                  📢 {article.channelName}
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground line-clamp-3">
            {article.content.replace(/<[^>]+>/g, '')}
          </p>
        </CardContent>

        <CardFooter>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Like
            </Button>
            <Button variant="ghost" size="sm">
              <ThumbsDown className="h-4 w-4 mr-2" />
              Dislike
            </Button>
            <Button variant="ghost" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
        </CardFooter>
      </Card>

      <AlertDialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Authentication Required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to be logged in to view channel details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowAuthDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={() => setLocation("/auth")}>
              Sign In
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
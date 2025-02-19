import { Article } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";

export function ArticleCard({ article }: { article: Article }) {
  return (
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
  );
}

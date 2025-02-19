import { useQuery } from "@tanstack/react-query";
import { Article, Channel } from "@shared/schema";
import { ArticleCard } from "@/components/article-card";
import { ChannelCard } from "@/components/channel-card";
import { NavigationBar } from "@/components/navigation-bar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2, PlusCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user } = useAuth();
  const { data: articles, isLoading: loadingArticles } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const { data: channels, isLoading: loadingChannels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />

      <div className="container mx-auto p-4 lg:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Your Feed</h1>
            <p className="text-muted-foreground mt-2">
              Latest articles from your favorite channels
            </p>
          </div>
          {user && (
            <Link href="/articles/new">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6">
            {loadingArticles ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : articles?.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No articles yet
              </div>
            ) : (
              articles?.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Popular Channels</h2>
              {loadingChannels ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : channels?.length === 0 ? (
                <div className="text-center p-4 text-muted-foreground">
                  No channels yet
                </div>
              ) : (
                channels?.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
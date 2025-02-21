import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { NavigationBar } from "@/components/navigation-bar";
import { Article, Channel } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, ArrowUpDown } from "lucide-react";
import { useState } from "react";

type SortField = "title" | "createdAt" | "category";
type SortOrder = "asc" | "desc";

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const { data: channel, isLoading: loadingChannel } = useQuery<Channel>({
    queryKey: [`/api/channels/${id}`],
  });

  const { data: articles, isLoading: loadingArticles } = useQuery<Article[]>({
    queryKey: [`/api/channels/${id}/articles`],
  });

  const isOwner = user?.id === channel?.userId;

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedArticles = articles?.slice().sort((a, b) => {
    const multiplier = sortOrder === "asc" ? 1 : -1;
    if (sortField === "createdAt") {
      return multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return multiplier * (a[sortField] < b[sortField] ? -1 : 1);
  });

  if (loadingChannel || loadingArticles) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="container mx-auto p-4 lg:p-8">
          <div className="text-center">Channel not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <div className="container mx-auto p-4 lg:p-8">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-8">
          <div>
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">{channel.name}</h1>
                <p className="text-muted-foreground">{channel.description}</p>
              </div>
              {isOwner && (
                <Button variant="outline">Edit Channel</Button>
              )}
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("title")}
                      >
                        Title
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("category")}
                      >
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("createdAt")}
                      >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedArticles?.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <a 
                          href={`/articles/${article.id}`}
                          className="hover:underline text-primary"
                        >
                          {article.title}
                        </a>
                      </TableCell>
                      <TableCell>{article.category}</TableCell>
                      <TableCell>
                        {new Date(article.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!sortedArticles?.length && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No articles published yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-xl font-semibold mb-4">Channel Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{articles?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Articles</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Subscribers</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground mt-4">
                    Created on {new Date(channel.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Channel Settings</h2>
                <div className="space-y-2">
                  <Button className="w-full" variant="outline">
                    Manage Subscribers
                  </Button>
                  <Button className="w-full" variant="outline">
                    Channel Analytics
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { NavigationBar } from "@/components/navigation-bar";
import { ArticleEditor } from "@/components/article-editor";
import { useQuery } from "@tanstack/react-query";
import { Article, Channel } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useParams } from "wouter";
import { Loader2 } from "lucide-react";
import { ArticleWithSnakeCase } from "@/types/article";
import { useEffect, useState } from "react";

export default function EditArticle() {
  // Try different approaches to extract the ID parameter
  const params = useParams();
  console.log("Edit Article Page - Full Params:", params);

  // The ID could be in different places depending on how wouter handles nested routes
  const id =
    params.id ||
    new URLSearchParams(window.location.search).get("articleId") ||
    window.location.pathname.split("/").filter(Boolean)[1];

  const { user } = useAuth();

  console.log("Edit Article Page - Extracted Article ID:", id);
  console.log("Edit Article Page - Current User:", user?.id);
  console.log("Edit Article Page - Current URL:", window.location.pathname);

  // Try to get stored article data from sessionStorage
  const [storedArticle, setStoredArticle] =
    useState<ArticleWithSnakeCase | null>(null);

  useEffect(() => {
    try {
      const savedArticle = sessionStorage.getItem("editArticleData");
      if (savedArticle) {
        const parsed = JSON.parse(savedArticle);
        console.log(
          "Edit Article Page - Retrieved article from sessionStorage:",
          parsed
        );
        setStoredArticle(parsed);
      }
    } catch (error) {
      console.error("Failed to parse stored article data:", error);
    }
  }, []);

  // Fetch the article to edit
  const {
    data: article,
    isLoading: loadingArticle,
    error: articleError,
  } = useQuery<ArticleWithSnakeCase>({
    queryKey: [`/api/articles/${id}`],
  });

  console.log("Edit Article Page - Article Error:", articleError);

  // Combine remote and local data
  const articleData = article || storedArticle;

  // Log article data when it's available
  useEffect(() => {
    if (articleData) {
      console.log("Edit Article Page - Article Data (combined):", articleData);
      console.log(
        "Edit Article Page - Article Owner:",
        articleData.userId || articleData.user_id
      );
    }
  }, [articleData]);

  // Check if user is logged in
  if (!user) {
    console.log("Edit Article Page - Redirecting: User not logged in");
    return <Redirect to="/" />;
  }

  // Fetch user's channels
  const { data: channels, isLoading: loadingChannels } = useQuery<Channel[]>({
    queryKey: ["/api/user/channels"],
  });

  // Show loading state only if we don't have stored article data
  if ((loadingArticle && !storedArticle) || loadingChannels) {
    return (
      <div className="flex min-h-screen flex-col">
        <NavigationBar />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavigationBar />
      <div className="container mx-auto max-w-4xl py-8">
        <h1 className="mb-8 text-3xl font-bold">Edit Article</h1>
        {articleData && channels ? (
          <ArticleEditor existingArticle={articleData} channels={channels} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <p className="text-muted-foreground">
                {!articleData
                  ? "Article data could not be loaded. Please go back to the article and try again."
                  : !channels
                  ? "No channels found. Please create a channel first."
                  : "Something went wrong"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

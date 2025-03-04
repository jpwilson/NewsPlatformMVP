import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage-supabase";
import { insertArticleSchema, insertCommentSchema, User } from "@shared/schema";
import { z } from "zod";
import { supabase } from "./supabase";
import passport from "passport";
import { isDev } from "./constants";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
    }
  }
}

// Update the channel schema for creation (separate from the full channel schema)
const insertChannelSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().optional(),
  location: z.string().optional(),
  bannerImage: z.string().optional(),
  profileImage: z.string().optional(),
  // Note: No 'id' required here since it will be auto-generated
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Channels
  app.post("/api/channels", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Parse and validate the incoming data with the insert schema
      const channelData = insertChannelSchema.parse(req.body);
      
      // Check if user has reached the maximum number of channels (10)
      const { data: existingChannels, error: countError } = await supabase
        .from("channels")
        .select("id")
        .eq("user_id", req.user.id);
      
      if (countError) throw countError;
      
      if (existingChannels && existingChannels.length >= 10) {
        return res.status(400).json({ 
          message: "Maximum limit reached. You cannot create more than 10 channels."
        });
      }
      
      console.log("Received channel data:", {
        ...channelData,
        userId: req.user.id
      });
      
      // Insert the channel with created_at timestamp
      const { data: channel, error } = await supabase
        .from("channels")
        .insert([{
          ...channelData,
          user_id: req.user.id,
          created_at: new Date().toISOString() // Add creation timestamp
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      res.json(channel);
    } catch (error) {
      console.error("Channel creation error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: JSON.stringify(error.errors, null, 2) });
      }
      
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  app.get("/api/channels", async (req, res) => {
    const channels = await storage.listChannels();
    res.json(channels);
  });

  app.get("/api/channels/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch the channel directly from Supabase to get all fields including created_at
      const { data: channel, error } = await supabase
        .from("channels")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }
      
      res.json(channel);
    } catch (error) {
      console.error("Error fetching channel:", error);
      res.status(500).json({ error: "Failed to fetch channel" });
    }
  });

  // Fetch articles by channel ID
  app.get("/api/channels/:id/articles", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch articles for this channel
      const { data: articles, error } = await supabase
        .from("articles")
        .select("*")
        .eq("channel_id", id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      res.json(articles || []);
    } catch (error) {
      console.error("Error fetching channel articles:", error);
      res.status(500).json({ error: "Failed to fetch channel articles" });
    }
  });

  // Articles
  app.post("/api/articles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Parse and validate with the insertion schema
      const articleData = insertArticleSchema.parse(req.body);
      
      console.log("Submitting article with data:", {
        ...articleData,
        userId: req.user.id
      });
      
      // Create the article
      const article = await storage.createArticle({
        ...articleData,
        userId: req.user.id
      });
      
      // If a location was selected, update the article with the locationId
      if (articleData.locationId) {
        const { error: locationError } = await supabase
          .from("articles")
          .update({ location_id: articleData.locationId })
          .eq("id", article.id);
          
        if (locationError) {
          console.error("Error updating article location:", locationError);
        }
      }
      
      // If categories were selected, add them to the article_categories junction table
      if (articleData.categoryId) {
        const { error: categoryError } = await supabase
          .from("article_categories")
          .insert({
            article_id: article.id,
            category_id: articleData.categoryId,
            is_primary: true
          });
          
        if (categoryError) {
          console.error("Error adding article category:", categoryError);
        }
      }
      
      res.json(article);
    } catch (error) {
      console.error("Article creation error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: JSON.stringify(error.errors, null, 2) });
      }
      
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.get("/api/articles", async (req, res) => {
    try {
      // First, fetch the articles
      const { data: articles, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // If we have articles, fetch the related channels
      if (articles && articles.length > 0) {
        // Extract all unique channel IDs
        const channelIds = Array.from(new Set(articles.map(article => article.channel_id)));
        
        // Fetch all relevant channels in a single query
        const { data: channels, error: channelsError } = await supabase
          .from("channels")
          .select("id, name")
          .in("id", channelIds);
          
        if (channelsError) throw channelsError;
        
        // For each article, fetch reaction counts and comment counts
        const enrichedArticles = await Promise.all(articles.map(async article => {
          // Find the channel for this article
          const channel = channels?.find(c => c.id === article.channel_id) || null;
          
          // Get reaction counts
          const { data: reactions, error: reactionsError } = await supabase
            .from("reactions")
            .select("is_like, user_id")
            .eq("article_id", article.id);
            
          let likes = 0;
          let dislikes = 0;
          let userReaction = null;
          
          if (!reactionsError && reactions) {
            likes = reactions.filter(r => r.is_like).length;
            dislikes = reactions.filter(r => !r.is_like).length;
            
            // If user is authenticated, check if they have reacted
            if (req.isAuthenticated()) {
              const userReactionData = reactions.find(r => 
                r.user_id === req.user.id
              );
              
              if (userReactionData) {
                userReaction = userReactionData.is_like;
              }
            }
          }
          
          // Get comment count
          const { data: commentCountData, error: commentCountError } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("article_id", article.id);
            
          // Ensure view_count is present, defaulting to 0 if not
          const viewCount = article.view_count || 0;
            
          return {
            ...article,
            channel,
            likes,
            dislikes,
            viewCount,
            userReaction,
            _count: { 
              comments: commentCountError ? 0 : (commentCountData?.length || 0)
            }
          };
        }));
        
        res.json(enrichedArticles);
      } else {
        res.json(articles || []);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch the article
      const { data: article, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // Fetch the related channel
      if (article && article.channel_id) {
        const { data: channel, error: channelError } = await supabase
          .from("channels")
          .select("id, name")
          .eq("id", article.channel_id)
          .single();
          
        if (!channelError && channel) {
          article.channel = channel;
        }
      }
      
      // Fetch reaction counts
      const { data: reactions, error: reactionsError } = await supabase
        .from("reactions")
        .select("is_like, user_id")
        .eq("article_id", id);
        
      if (!reactionsError && reactions) {
        const likes = reactions.filter(r => r.is_like).length;
        const dislikes = reactions.filter(r => !r.is_like).length;
        article.likes = likes;
        article.dislikes = dislikes;
      }
      
      // If user is authenticated, check if they have reacted
      if (req.isAuthenticated()) {
        const { data: userReaction, error: userReactionError } = await supabase
          .from("reactions")
          .select("is_like")
          .eq("article_id", id)
          .eq("user_id", req.user.id)
          .maybeSingle();
          
        if (!userReactionError && userReaction) {
          article.userReaction = userReaction.is_like;
        }
      }
      
      // Get comment count
      const { data: commentCountData, error: commentCountError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("article_id", id);
        
      if (!commentCountError) {
        article._count = { comments: commentCountData?.length || 0 };
      }
      
      // Ensure viewCount is included in the response
      article.viewCount = article.view_count || 0;
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.patch("/api/articles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const article = await storage.getArticle(parseInt(req.params.id));
    if (!article) return res.sendStatus(404);
    if (article.userId !== req.user.id) return res.sendStatus(403);
    const updatedArticle = await storage.updateArticle(
      parseInt(req.params.id),
      req.body
    );
    res.json(updatedArticle);
  });

  // Comments
  app.post("/api/articles/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const commentData = insertCommentSchema.parse(req.body);
    const comment = await storage.createComment({
      ...commentData,
      articleId: parseInt(req.params.id),
      userId: req.user.id,
    });
    res.json(comment);
  });

  app.get("/api/articles/:id/comments", async (req, res) => {
    const comments = await storage.listComments(parseInt(req.params.id));
    res.json(comments);
  });

  // Reactions
  app.post("/api/articles/:id/reactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const articleId = parseInt(req.params.id);
      const userId = req.user.id;
      const isLike = req.body.isLike;
      
      console.log("Processing reaction:", { articleId, userId, isLike });
      
      // First, clean up any duplicate reactions (temporary fix)
      try {
        const { data: duplicates, error: findAllError } = await supabase
          .from("reactions")
          .select("id")
          .eq("article_id", articleId)
          .eq("user_id", userId);
          
        if (findAllError) {
          console.error("Error finding all reactions:", findAllError);
        } else if (duplicates && duplicates.length > 1) {
          console.log(`Found ${duplicates.length} duplicate reactions, keeping only the first one`);
          
          // Keep the first one, delete the rest
          const keepId = duplicates[0].id;
          const idsToDelete = duplicates.slice(1).map(d => d.id);
          
          const { error: cleanupError } = await supabase
            .from("reactions")
            .delete()
            .in("id", idsToDelete);
            
          if (cleanupError) {
            console.error("Error cleaning up duplicate reactions:", cleanupError);
          } else {
            console.log(`Successfully deleted ${idsToDelete.length} duplicate reactions`);
          }
        }
      } catch (cleanupError) {
        console.error("Error in cleanup process:", cleanupError);
        // Continue with the main operation even if cleanup fails
      }
      
      // Get the single reaction (after cleanup)
      const { data: existingReactions, error: findError } = await supabase
        .from("reactions")
        .select("id, is_like")
        .eq("article_id", articleId)
        .eq("user_id", userId)
        .limit(1);
      
      if (findError) {
        console.error("Error finding existing reaction:", findError);
        throw findError;
      }
      
      // Get the first reaction if any exist
      const existingReaction = existingReactions && existingReactions.length > 0 
        ? existingReactions[0] 
        : null;
      
      console.log("Existing reaction:", existingReaction);
      
      // If reaction exists and is the same type, remove it (toggle off)
      if (existingReaction && existingReaction.is_like === isLike) {
        const { error: deleteError } = await supabase
          .from("reactions")
          .delete()
          .eq("id", existingReaction.id);
          
        if (deleteError) {
          console.error("Error deleting reaction:", deleteError);
          throw deleteError;
        }
        
        return res.json({ removed: true, isLike });
      }
      
      // If reaction exists but is different type, update it
      if (existingReaction) {
        const { data: updatedReaction, error: updateError } = await supabase
          .from("reactions")
          .update({ is_like: isLike })
          .eq("id", existingReaction.id)
          .select()
          .single();
          
        if (updateError) {
          console.error("Error updating reaction:", updateError);
          throw updateError;
        }
        
        return res.json(updatedReaction);
      }
      
      // Otherwise create a new reaction
      const { data: newReaction, error: createError } = await supabase
        .from("reactions")
        .insert({
          article_id: articleId,
          user_id: userId,
          is_like: isLike
        })
        .select()
        .single();
        
      if (createError) {
        console.error("Error creating reaction:", createError, {
          article_id: articleId,
          user_id: userId,
          is_like: isLike
        });
        throw createError;
      }
      
      res.json(newReaction);
    } catch (error) {
      console.error("Error handling reaction:", error);
      res.status(500).json({ error: "Failed to process reaction", details: String(error) });
    }
  });

  // Get reactions for an article
  app.get("/api/articles/:id/reactions", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      
      // Get all reactions for this article
      const { data: reactions, error } = await supabase
        .from("reactions")
        .select("is_like, user_id")
        .eq("article_id", articleId);
        
      if (error) throw error;
      
      // Calculate counts
      const likes = reactions?.filter(r => r.is_like).length || 0;
      const dislikes = reactions?.filter(r => !r.is_like).length || 0;
      
      // Get user's reaction if authenticated
      let userReaction = null;
      if (req.isAuthenticated()) {
        const { data: userReactionData, error: userError } = await supabase
          .from("reactions")
          .select("is_like")
          .eq("article_id", articleId)
          .eq("user_id", req.user.id)
          .maybeSingle();
          
        if (!userError && userReactionData) {
          userReaction = userReactionData.is_like;
        }
      }
      
      res.json({ likes, dislikes, userReaction });
    } catch (error) {
      console.error("Error fetching reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Subscriptions
  app.post("/api/channels/:id/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const subscription = await storage.createSubscription({
      channelId: parseInt(req.params.id),
      userId: req.user.id,
    });
    res.json(subscription);
  });

  app.delete("/api/channels/:id/subscribe", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteSubscription(
      parseInt(req.params.id),
      req.user.id
    );
    res.sendStatus(200);
  });

  // Get channels that a user is subscribed to
  app.get("/api/user/subscriptions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // First, fetch the user's subscriptions
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from("subscriptions")
        .select("channel_id")
        .eq("user_id", req.user.id);
      
      if (subscriptionsError) throw subscriptionsError;
      
      if (!subscriptions || subscriptions.length === 0) {
        return res.json([]);
      }
      
      // Then fetch details of those channels
      const channelIds = subscriptions.map(sub => sub.channel_id);
      
      const { data: channels, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .in("id", channelIds);
        
      if (channelsError) throw channelsError;
      
      res.json(channels || []);
    } catch (error) {
      console.error("Error fetching user subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  // Get user information by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get categories
  app.get("/api/categories", async (req, res) => {
    try {
      // Fetch all categories from the database
      const { data: categories, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      // Transform into a hierarchical structure
      const categoryMap = new Map();
      const rootCategories = [];
      
      // First pass: create all category objects and store in map
      categories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });
      
      // Second pass: build the hierarchy
      categories.forEach(category => {
        const categoryWithChildren = categoryMap.get(category.id);
        
        if (category.parent_id === null) {
          // This is a root category
          rootCategories.push(categoryWithChildren);
        } else {
          // This is a child category, add to its parent's children array
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(categoryWithChildren);
          }
        }
      });
      
      res.json(rootCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get locations
  app.get("/api/locations", async (req, res) => {
    try {
      // Fetch all locations from the database
      const { data: locations, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      // Transform into a hierarchical structure
      const locationMap = new Map();
      const rootLocations = [];
      
      // First pass: create all location objects and store in map
      locations.forEach(location => {
        locationMap.set(location.id, { ...location, children: [] });
      });
      
      // Second pass: build the hierarchy
      locations.forEach(location => {
        const locationWithChildren = locationMap.get(location.id);
        
        if (location.parent_id === null) {
          // This is a root location
          rootLocations.push(locationWithChildren);
        } else {
          // This is a child location, add to its parent's children array
          const parent = locationMap.get(location.parent_id);
          if (parent) {
            parent.children.push(locationWithChildren);
          }
        }
      });
      
      res.json(rootLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Update user information by ID
  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const userId = parseInt(req.params.id);
      
      // Check if the authenticated user is trying to update their own profile
      if (req.user.id !== userId) {
        return res.status(403).json({ message: "Not authorized to update this user" });
      }
      
      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Add article view endpoint
  app.post("/api/articles/:id/view", async (req, res) => {
    try {
      const articleId = parseInt(req.params.id);
      
      // Get user ID if authenticated or use null for anonymous users
      const userId = req.isAuthenticated() ? req.user.id : null;
      
      // Use IP address as client identifier
      const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const clientIdentifier = userId ? `user-${userId}` : `ip-${clientIp}`;
      
      console.log("Processing view:", { articleId, userId, clientIdentifier });
      
      // First, check if view_count column exists in articles table
      const { data: columnCheck, error: columnError } = await supabase
        .from('articles')
        .select('view_count')
        .limit(1);
        
      // If column doesn't exist, create it
      if (columnError) {
        console.error("Error checking view_count column:", columnError);
        // We'll handle this by assuming it might not exist yet
      }
      
      // Then check if article_views table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('article_views')
        .select('id')
        .limit(1);
        
      // If we get an error, the table might not exist
      if (tableError) {
        console.log("article_views table may not exist:", tableError);
        console.log("Falling back to simple view count increment");
        
        // Just increment the view count directly
        const { data: article } = await supabase
          .from("articles")
          .select("view_count")
          .eq("id", articleId)
          .single();
          
        const currentViews = article?.view_count || 0;
        
        await supabase
          .from("articles")
          .update({ view_count: currentViews + 1 })
          .eq("id", articleId);
          
        return res.json({ counted: true });
      }
      
      // Check if this client has viewed this article before (ever)
      const { data: existingViews, error: viewsError } = await supabase
        .from("article_views")
        .select("id")
        .eq("article_id", articleId)
        .eq("client_identifier", clientIdentifier);
        
      if (viewsError) {
        console.error("Error checking views:", viewsError);
        return res.status(500).json({ error: "Failed to check view count" });
      }
      
      // If user has already viewed this article before, don't count another view
      if (existingViews && existingViews.length > 0) {
        return res.json({ 
          counted: false, 
          message: "View already counted for this article",
          alreadyViewed: true
        });
      }
      
      // Record this view
      const { error: insertError } = await supabase
        .from("article_views")
        .insert({
          article_id: articleId,
          user_id: userId,
          client_identifier: clientIdentifier
        });
        
      if (insertError) {
        console.error("Error recording view:", insertError);
        return res.status(500).json({ error: "Failed to record view" });
      }
      
      // Increment the view count in the articles table
      const { data: article, error: getError } = await supabase
        .from("articles")
        .select("view_count")
        .eq("id", articleId)
        .single();
        
      if (getError) {
        console.error("Error getting current view count:", getError);
        return res.status(500).json({ error: "Failed to get current view count" });
      }
      
      const currentViews = article?.view_count || 0;
      
      const { error: updateError } = await supabase
        .from("articles")
        .update({ view_count: currentViews + 1 })
        .eq("id", articleId);
        
      if (updateError) {
        console.error("Error updating view count:", updateError);
        return res.status(500).json({ error: "Failed to update view count" });
      }
      
      res.json({ 
        counted: true,
        firstView: true
      });
    } catch (error) {
      console.error("Error handling view count:", error);
      res.status(500).json({ error: "Failed to update view count" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
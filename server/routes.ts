import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage-supabase";
import { insertArticleSchema, insertCommentSchema } from "@shared/schema";
import { z } from "zod";
import { supabase } from "./supabase";

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
      
      const article = await storage.createArticle({
        ...articleData,
        userId: req.user.id
      });
      
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
        
        // Map channels to articles
        const articlesWithChannels = articles.map(article => {
          const channel = channels?.find(c => c.id === article.channel_id);
          return {
            ...article,
            channel: channel || null
          };
        });
        
        res.json(articlesWithChannels);
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
    const reaction = await storage.createReaction({
      articleId: parseInt(req.params.id),
      userId: req.user.id,
      isLike: req.body.isLike,
    });
    res.json(reaction);
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
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Return user info without sensitive data
      const { password, ...userInfo } = user;
      res.json(userInfo);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
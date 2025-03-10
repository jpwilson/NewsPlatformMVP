// This file contains a simplified version of the API routes for Vercel deployment
import type { Express } from "express";
import { supabase } from "./supabase";
import { z } from "zod";

// Simplified registerRoutes function that doesn't depend on any server-side code
export async function registerRoutes(app: Express): Promise<void> {
  // Log environment variables (don't log sensitive values)
  console.log("API Routes initializing");
  console.log("Environment:", process.env.NODE_ENV);

  // Basic health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
      deployment: "vercel"
    });
  });

  // User routes - simplified for deployment
  app.get("/api/user", (req, res) => {
    // For now, return unauthorized since session handling needs more work
    return res.sendStatus(401);
  });

  // Channels route
  app.get("/api/channels", async (req, res) => {
    try {
      console.log("Fetching channels from Supabase");
      // Fetch all channels from Supabase
      const { data: channels, error } = await supabase
        .from("channels")
        .select("*");
      
      if (error) {
        console.error("Error fetching channels:", error);
        return res.status(500).json({ error: "Failed to fetch channels" });
      }
      
      console.log(`Successfully fetched ${channels?.length || 0} channels`);
      
      // Enrich each channel with subscriber count
      const enrichedChannels = await Promise.all((channels || []).map(async (channel) => {
        // Get subscriber count
        const { count, error: countError } = await supabase
          .from("subscriptions")
          .select("*", { count: 'exact', head: true })
          .eq("channel_id", channel.id);
          
        if (countError) {
          console.error(`Error fetching subscriber count for channel ${channel.id}:`, countError);
        }
        
        return {
          ...channel,
          subscriberCount: count || 0
        };
      }));
      
      res.json(enrichedChannels || []);
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Failed to fetch channels", details: String(error) });
    }
  });

  // Articles route
  app.get("/api/articles", async (req, res) => {
    try {
      console.log("Fetching articles from Supabase");
      const { data: articles, error } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching articles:", error);
        return res.status(500).json({ error: "Failed to fetch articles" });
      }

      console.log(`Successfully fetched ${articles?.length || 0} articles`);
      res.json(articles || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles", details: String(error) });
    }
  });
} 
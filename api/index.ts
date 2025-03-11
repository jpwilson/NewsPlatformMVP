import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client directly
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Create Express app
const app = express();

// Debug logs for deployment
console.log("API Handler initializing (all-in-one version)");
console.log("Environment:", process.env.NODE_ENV);
console.log("Has SUPABASE_URL:", !!process.env.SUPABASE_URL);
console.log("Has SUPABASE_SERVICE_KEY:", !!process.env.SUPABASE_SERVICE_KEY);

// Setup Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS handling
app.use((req, res, next) => {
  // Set appropriate CORS headers for production
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// ===== DIRECT ROUTE IMPLEMENTATIONS =====

// Health check route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    deployment: "vercel-inline" 
  });
});

// User route
app.get("/api/user", async (req, res) => {
  try {
    // Extract the Authorization header (if any)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.sendStatus(401);
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.sendStatus(401);
    }
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('Error verifying user token:', error);
      return res.sendStatus(401);
    }
    
    // Look up the user in our database
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', user.id)
      .single();
    
    if (dbError || !dbUser) {
      console.error('Error finding user in database:', dbError);
      return res.sendStatus(401);
    }
    
    // Return the user
    return res.json(dbUser);
  } catch (error) {
    console.error('Error in /api/user endpoint:', error);
    return res.sendStatus(401);
  }
});

// Add Supabase callback endpoint for Google OAuth
app.post('/api/auth/supabase-callback', async (req, res) => {
  try {
    const { supabase_uid, email, name } = req.body;
    
    console.log('Supabase OAuth callback received:', { 
      supabase_uid: supabase_uid ? "✓" : "✗", 
      email: email ? "✓" : "✗",
      name: name ? "✓" : "✗"
    });
    
    if (!supabase_uid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing Supabase user ID' 
      });
    }
    
    // Try to find existing user with this Supabase ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', supabase_uid)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding user:', findError);
      return res.status(500).json({ 
        success: false, 
        error: 'Database error when finding user' 
      });
    }
    
    if (existingUser) {
      console.log('Found existing user:', existingUser.username);
      return res.json({ 
        success: true, 
        user: existingUser 
      });
    }
    
    // Create a new user
    const username = email ? email.split('@')[0] : `user_${Date.now()}`;
    console.log('Creating new user with username:', username);
    
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ 
        username, 
        password: '', // No password needed
        supabase_uid 
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user:', createError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create user' 
      });
    }
    
    return res.json({ 
      success: true, 
      user: newUser 
    });
  } catch (error) {
    console.error('Error in Supabase callback:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: String(error)
    });
  }
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

// Articles route with channel data
app.get("/api/articles", async (req, res) => {
  try {
    console.log("Fetching articles with channel data from Supabase");
    
    // Fetch articles first
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
      
    if (articlesError) {
      console.error("Error fetching articles:", articlesError);
      return res.status(500).json({ error: "Failed to fetch articles" });
    }
    
    // If we have articles, fetch all needed channels in one query
    if (articles && articles.length > 0) {
      // Get unique channel IDs
      const channelIds = [...new Set(articles.map(article => article.channel_id))].filter(Boolean);
      console.log(`Found ${channelIds.length} unique channel IDs:`, channelIds);
      
      if (channelIds.length > 0) {
        const { data: channels, error: channelsError } = await supabase
          .from("channels")
          .select("*")
          .in("id", channelIds);
          
        if (channelsError) {
          console.error("Error fetching channels for articles:", channelsError);
        } else if (channels && channels.length > 0) {
          console.log(`Successfully fetched ${channels.length} channels`);
          
          // Create a map for quick lookup
          const channelMap = channels.reduce((map, channel) => {
            map[channel.id] = channel;
            return map;
          }, {});
          
          // Attach channel to each article
          const articlesWithChannels = articles.map(article => {
            const channelId = article.channel_id;
            const channel = channelId ? channelMap[channelId] : null;
            return {
              ...article,
              channel: channel
            };
          });
          
          console.log(`Successfully enhanced ${articlesWithChannels.length} articles with channel data`);
          return res.json(articlesWithChannels || []);
        }
      }
    }
    
    // Fallback: return articles without channels
    console.log(`Returning ${articles?.length || 0} articles without channel data`);
    res.json(articles || []);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles", details: String(error) });
  }
});

// Single article route (needed for article detail page)
app.get("/api/articles/:id", async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    if (isNaN(articleId)) {
      return res.status(400).json({ error: "Invalid article ID" });
    }
    
    console.log(`Fetching article ${articleId} with channel data`);
    
    // Fetch article with channel info
    const { data: article, error } = await supabase
      .from("articles")
      .select(`
        *,
        channel:channel_id (
          id,
          name,
          description,
          category,
          location,
          bannerImage,
          profileImage,
          user_id,
          created_at
        )
      `)
      .eq("id", articleId)
      .single();

    if (error) {
      console.error(`Error fetching article ${articleId}:`, error);
      
      // Fallback to just fetching the article
      const { data: articleOnly, error: articleError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();
        
      if (articleError) {
        console.error(`Error fetching article ${articleId}:`, articleError);
        return res.status(404).json({ error: "Article not found" });
      }
      
      // Get the channel separately
      if (articleOnly && articleOnly.channel_id) {
        const { data: channel, error: channelError } = await supabase
          .from("channels")
          .select("*")
          .eq("id", articleOnly.channel_id)
          .single();
          
        if (channelError) {
          console.error(`Error fetching channel for article ${articleId}:`, channelError);
        } else if (channel) {
          articleOnly.channel = channel;
        }
      }
      
      return res.json(articleOnly);
    }

    res.json(article);
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ error: "Failed to fetch article", details: String(error) });
  }
});

// Add session-from-hash endpoint to help with authentication
app.post('/api/auth/session-from-hash', async (req, res) => {
  try {
    const { access_token, refresh_token, expires_in, provider_token } = req.body;
    
    console.log('Session from hash received:', { 
      access_token: access_token ? "✓" : "✗", 
      refresh_token: refresh_token ? "✓" : "✗",
      expires_in: expires_in ? "✓" : "✗",
      provider_token: provider_token ? "✓" : "✗"
    });
    
    if (!access_token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing access token' 
      });
    }
    
    // Return success response
    return res.json({ 
      success: true, 
      message: 'Session parameters received' 
    });
  } catch (error) {
    console.error('Error in session-from-hash:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: String(error)
    });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

// Handle all API routes
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("API request received:", req.method, req.url);
  
  // Forward to express app
  return new Promise((resolve) => {
    // Create a custom middleware to handle the request
    const handleRequest = (req: any, res: any) => {
      app(req, res, () => {
        resolve(undefined);
      });
    };
    
    handleRequest(req, res);
  });
} 
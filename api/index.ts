import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client directly
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Validate keys
if (!supabaseUrl) {
  console.error("CRITICAL ERROR: Missing SUPABASE_URL environment variable");
}
if (!supabaseServiceKey) {
  console.error("CRITICAL ERROR: Missing SUPABASE_SERVICE_KEY environment variable");
}

// Create two clients - one for auth verification (using the token from the client)
// and one with admin rights for database operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

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
    console.log("User endpoint called");
    
    // Extract the Authorization header (if any)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No Authorization header found");
      return res.sendStatus(401);
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log("No token found in Authorization header");
      return res.sendStatus(401);
    }
    
    console.log("Verifying user token...");
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
    
    if (error || !user) {
      console.error('Error verifying user token:', error);
      return res.sendStatus(401);
    }
    
    const supabaseUid = user.id;
    console.log("User verified, Supabase UID:", supabaseUid);
    console.log("User email:", user.email);
    console.log("User metadata:", user.user_metadata);
    
    // Look up the user in our database
    console.log("Looking up user in database with Supabase UID:", supabaseUid);
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', supabaseUid)
      .single();
    
    if (dbError) {
      console.error('Error finding user in database:', dbError);
      if (dbError.code === 'PGRST116') {
        console.log("No user found in the database with supabase_uid:", supabaseUid);
      }
      
      // FALLBACK: Try to get user by username if supabase_uid fails
      const username = user.email?.split('@')[0] || user.user_metadata?.name || user.user_metadata?.full_name;
      if (username) {
        console.log('Trying fallback: looking up user by username:', username);
        const { data: userByUsername, error: usernameError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();
          
        if (usernameError) {
          console.error('Fallback search also failed:', usernameError);
        } else if (userByUsername) {
          console.log('Found user by username instead:', userByUsername);
          
          // Update this user's supabase_uid if it's missing
          if (!userByUsername.supabase_uid) {
            console.log('Updating user record with correct Supabase UID');
            const { error: updateError } = await supabase
              .from('users')
              .update({ supabase_uid: supabaseUid })
              .eq('id', userByUsername.id);
              
            if (updateError) {
              console.error('Failed to update user with Supabase UID:', updateError);
            }
          }
          
          // Return this user
          return res.json(userByUsername);
        }
      }
      
      return res.sendStatus(401);
    }
    
    if (!dbUser) {
      console.log("User record exists but data is null");
      return res.sendStatus(401);
    }
    
    console.log("User found in database, ID:", dbUser.id);
    
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
      // Get subscriber count using a more direct approach that works in all environments
      try {
        const { count, error: countError } = await supabase
          .from("subscriptions")
          .select("*", { count: 'exact', head: true })
          .eq("channel_id", channel.id);
          
        if (countError) {
          console.error(`Error fetching subscriber count for channel ${channel.id}:`, countError);
          return {
            ...channel,
            subscriberCount: 0
          };
        }
        
        console.log(`Channel ${channel.id} (${channel.name}) has ${count || 0} subscribers`);
        
        return {
          ...channel,
          subscriberCount: count || 0
        };
      } catch (countError) {
        console.error(`Unexpected error fetching subscriber count for channel ${channel.id}:`, countError);
        return {
          ...channel,
          subscriberCount: 0
        };
      }
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

// Add logout endpoint
app.post("/api/logout", async (req, res) => {
  try {
    console.log("Logout requested");
    
    // Extract the Authorization header to identify the session
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      // Sign out from Supabase
      const { error } = await supabaseAuth.auth.signOut();
      
      if (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ error: 'Failed to logout' });
      }
    }
    
    // Return success even if no token was provided
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in logout endpoint:', error);
    return res.status(500).json({ error: 'Server error during logout' });
  }
});

// Add user channels endpoint
app.get("/api/user/channels", async (req, res) => {
  try {
    console.log("User channels endpoint called");
    
    // Extract the Authorization header (if any)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No Authorization header found");
      return res.sendStatus(401);
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log("No token found in Authorization header");
      return res.sendStatus(401);
    }
    
    console.log("Verifying user token...");
    
    // Verify the token with Supabase
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error verifying user token:', userError);
      return res.sendStatus(401);
    }
    
    const supabaseUid = userData.user.id;
    console.log("User verified, Supabase UID:", supabaseUid);
    
    // IMPORTANT DEBUG: Directly query the users table to understand the data structure
    try {
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, username, supabase_uid')
        .limit(10);
        
      if (allUsersError) {
        console.error('Error querying users table:', allUsersError);
      } else {
        console.log('First 10 users in database:', allUsers);
        
        // Find this user in the returned users
        const currentUserInList = allUsers?.find(u => u.supabase_uid === supabaseUid);
        if (currentUserInList) {
          console.log('Found current user in users table:', currentUserInList);
        } else {
          console.log('Current user NOT found in users table. Looking for Supabase UID:', supabaseUid);
        }
      }
    } catch (userQueryError) {
      console.error('Exception querying users table:', userQueryError);
    }
    
    // Look up the user in our database
    console.log("Looking up user in database with Supabase UID:", supabaseUid);
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', supabaseUid)
      .single();
    
    if (dbError) {
      console.error('Error finding user in database:', dbError);
      if (dbError.code === 'PGRST116') {
        console.log("No user found in the database with supabase_uid:", supabaseUid);
      }
      
      // FALLBACK: Try to get user by username if supabase_uid fails
      const username = userData.user.email?.split('@')[0] || userData.user.user_metadata?.name || userData.user.user_metadata?.full_name;
      if (username) {
        console.log('Trying fallback: looking up user by username:', username);
        const { data: userByUsername, error: usernameError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();
          
        if (usernameError) {
          console.error('Fallback search also failed:', usernameError);
          return res.status(401).json({ error: 'User not found in database', details: dbError });
        }
        
        if (userByUsername) {
          console.log('Found user by username instead:', userByUsername);
          
          // Update this user's supabase_uid if it's missing
          if (!userByUsername.supabase_uid) {
            console.log('Updating user record with correct Supabase UID');
            const { error: updateError } = await supabase
              .from('users')
              .update({ supabase_uid: supabaseUid })
              .eq('id', userByUsername.id);
              
            if (updateError) {
              console.error('Failed to update user with Supabase UID:', updateError);
            }
          }
          
          // Continue with this user
          const userId = userByUsername.id;
          console.log(`Using user ID ${userId} found by username instead`);
          
          // Fetch channels for this user ID
          const { data: channels, error: channelsError } = await supabase
            .from('channels')
            .select('*')
            .eq('user_id', userId);
            
          if (channelsError) {
            console.error('Error fetching user channels by username fallback:', channelsError);
            return res.status(500).json({ error: 'Failed to fetch user channels', details: channelsError });
          }
          
          console.log(`Found ${channels?.length || 0} channels for user ${username} via fallback method`);
          return res.json(channels || []);
        }
      }
      
      return res.status(401).json({ error: 'User not found in database', details: dbError });
    }
    
    if (!dbUser) {
      console.log("User not found in database");
      return res.status(401).json({ error: 'User not found in database' });
    }
    
    const userId = dbUser.id;
    console.log("User found in database, ID:", userId);
    
    // Fetch channels owned by this user
    console.log(`Fetching channels for user ID ${userId}...`);
    
    // First, check if we can query the channels table
    try {
      const { count, error: countError } = await supabase
        .from('channels')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Error checking channels table:', countError);
      } else {
        console.log(`Total channels in database: ${count || 0}`);
      }
    } catch (countErr) {
      console.error('Unexpected error checking channels table:', countErr);
    }
    
    try {
      // IMPORTANT: Print all channels in the database to see if data exists
      const { data: allChannels, error: allChannelsError } = await supabase
        .from('channels')
        .select('id, name, user_id')
        .limit(20);
        
      if (allChannelsError) {
        console.error('Error querying all channels:', allChannelsError);
      } else {
        console.log('All channels in database:', allChannels);
      }
      
      // Normal query for this user's channels
      const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('user_id', userId);
        
      if (channelsError) {
        console.error('Error fetching user channels:', channelsError);
        return res.status(500).json({ error: 'Failed to fetch user channels', details: channelsError });
      }
      
      console.log(`Found ${channels?.length || 0} channels for user ${dbUser.username}`);
      if (channels && channels.length > 0) {
        console.log('Channel IDs:', channels.map(c => c.id).join(', '));
      } else {
        console.log('No channels found for this user');
      }
      
      // Return the channels
      return res.json(channels || []);
    } catch (channelsErr) {
      console.error('Unexpected error fetching channels:', channelsErr);
      return res.status(500).json({ 
        error: 'Unexpected error fetching channels', 
        details: String(channelsErr) 
      });
    }
  } catch (error) {
    console.error('Error in /api/user/channels endpoint:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: String(error)
    });
  }
});

// Add user subscriptions endpoint
app.get("/api/user/subscriptions", async (req, res) => {
  try {
    console.log("User subscriptions endpoint called");
    
    // Extract the Authorization header (if any)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log("No Authorization header found");
      return res.sendStatus(401);
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log("No token found in Authorization header");
      return res.sendStatus(401);
    }
    
    console.log("Verifying user token...");
    
    // Verify the token with Supabase
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error('Error verifying user token:', userError);
      return res.sendStatus(401);
    }
    
    const supabaseUid = userData.user.id;
    console.log("User verified, Supabase UID:", supabaseUid);
    
    // Look up the user in our database
    console.log("Looking up user in database with Supabase UID:", supabaseUid);
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('supabase_uid', supabaseUid)
      .single();
    
    if (dbError) {
      console.error('Error finding user in database:', dbError);
      if (dbError.code === 'PGRST116') {
        console.log("No user found in the database with supabase_uid:", supabaseUid);
      }
      
      // FALLBACK: Try to get user by username if supabase_uid fails
      const username = userData.user.email?.split('@')[0] || userData.user.user_metadata?.name || userData.user.user_metadata?.full_name;
      if (username) {
        console.log('Trying fallback: looking up user by username:', username);
        const { data: userByUsername, error: usernameError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .single();
          
        if (usernameError) {
          console.error('Fallback search also failed:', usernameError);
          return res.status(401).json({ error: 'User not found in database', details: dbError });
        }
        
        if (userByUsername) {
          console.log('Found user by username instead:', userByUsername);
          
          // Update this user's supabase_uid if it's missing
          if (!userByUsername.supabase_uid) {
            console.log('Updating user record with correct Supabase UID');
            const { error: updateError } = await supabase
              .from('users')
              .update({ supabase_uid: supabaseUid })
              .eq('id', userByUsername.id);
              
            if (updateError) {
              console.error('Failed to update user with Supabase UID:', updateError);
            }
          }
          
          // Continue with this user for subscriptions
          const userId = userByUsername.id;
          console.log(`Using user ID ${userId} found by username instead`);
          
          return handleUserSubscriptions(userId, res);
        }
      }
      
      return res.status(401).json({ error: 'User not found in database', details: dbError });
    }
    
    if (!dbUser) {
      console.log("User not found in database");
      return res.status(401).json({ error: 'User not found in database' });
    }
    
    const userId = dbUser.id;
    console.log("User found in database, ID:", userId);
    
    return handleUserSubscriptions(userId, res);
  } catch (error) {
    console.error('Error in /api/user/subscriptions endpoint:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: String(error)
    });
  }
});

// Helper function to handle getting user subscriptions by ID
async function handleUserSubscriptions(userId: number, res: any) {
  try {
    console.log(`Fetching subscriptions for user ID ${userId}...`);
    
    // First get just the subscription records
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, channel_id')
      .eq('user_id', userId);
      
    if (subsError) {
      console.error('Error fetching user subscriptions:', subsError);
      return res.status(500).json({ error: 'Failed to fetch user subscriptions', details: subsError });
    }
    
    // If no subscriptions, return empty array
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user');
      return res.json([]);
    }
    
    console.log(`Found ${subscriptions.length} subscriptions for user ${userId}`);
    const channelIds = subscriptions.map(sub => sub.channel_id);
    console.log('Subscription channel IDs:', channelIds);
    
    // Now fetch the channel data separately
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds);
      
    if (channelsError) {
      console.error('Error fetching channels for subscriptions:', channelsError);
      return res.status(500).json({ error: 'Failed to fetch subscription channels', details: channelsError });
    }
    
    console.log(`Found ${channels?.length || 0} channels for subscriptions`);
    
    // If no channels found or fewer channels than subscriptions, log warning
    if (!channels || channels.length < subscriptions.length) {
      console.warn(`Warning: Found fewer channels (${channels?.length || 0}) than subscriptions (${subscriptions.length})`);
    }
    
    // Create a map of channel id to channel data
    const channelMap = {};
    if (channels) {
      channels.forEach(channel => {
        channelMap[channel.id] = channel;
      });
    }
    
    // Enrich each channel with subscriber count
    for (const channelId in channelMap) {
      try {
        const { count, error: countError } = await supabase
          .from("subscriptions")
          .select("*", { count: 'exact', head: true })
          .eq("channel_id", channelId);
          
        if (!countError) {
          channelMap[channelId].subscriberCount = count || 0;
        }
      } catch (error) {
        console.error(`Error getting subscriber count for channel ${channelId}:`, error);
      }
    }
    
    // Format the response to match what the frontend expects
    const formattedSubscriptions = subscriptions.map(sub => {
      const channel = channelMap[sub.channel_id];
      return {
        ...sub,
        channel,
        subscriptionDate: new Date().toISOString() // Use current date as fallback for now
      };
    });
    
    console.log(`Returning ${formattedSubscriptions.length} formatted subscriptions`);
    
    // Return the subscriptions
    return res.json(formattedSubscriptions);
  } catch (error) {
    console.error('Error handling user subscriptions:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: String(error)
    });
  }
}

// Remove the user-specific endpoints and add proper parameterized debug endpoints
// 1. Debug endpoint for channels with proper query parameters
app.get("/api/debug/channels", async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    console.log(`Debug endpoint: Fetching channels${userId ? ` for user ID ${userId}` : ' (all channels)'}`);
    
    // Build query
    let query = supabase.from("channels").select("*");
    
    // Apply userId filter if provided
    if (userId) {
      query = query.eq("user_id", userId);
    }
    
    // Execute query
    const { data: channels, error } = await query;
    
    if (error) {
      console.error("Debug endpoint error:", error);
      return res.status(500).json({ 
        success: false,
        message: "Error fetching channels", 
        error: error.message,
        count: 0,
        channels: []
      });
    }
    
    console.log(`Debug endpoint: Found ${channels.length} channels${userId ? ` for user ID ${userId}` : ''}`);
    
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
    
    return res.status(200).json({ 
      success: true,
      message: `Channels found${userId ? ` for user ID ${userId}` : ''}`, 
      count: enrichedChannels.length,
      channels: enrichedChannels
    });
  } catch (error) {
    console.error("Debug endpoint unexpected error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Unexpected error fetching channels", 
      error: error.message,
      count: 0,
      channels: []
    });
  }
});

// 2. Debug endpoint for subscriptions with proper query parameters
app.get("/api/debug/subscriptions", async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
    console.log(`Debug endpoint: Fetching subscriptions${userId ? ` for user ID ${userId}` : ' (all subscriptions)'}`);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required for fetching subscriptions",
        count: 0,
        subscriptions: []
      });
    }
    
    // Get subscriptions for the specified user
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, channel_id')
      .eq('user_id', userId);
      
    if (subsError) {
      console.error(`Debug endpoint error for subscriptions (user ID ${userId}):`, subsError);
      return res.status(500).json({ 
        success: false,
        message: "Error fetching subscriptions", 
        error: subsError.message,
        count: 0,
        subscriptions: []
      });
    }
    
    // If no subscriptions, return empty array
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found for user ID ${userId}`);
      return res.json({ 
        success: true,
        message: `No subscriptions found for user ID ${userId}`, 
        count: 0,
        subscriptions: [] 
      });
    }
    
    // Get the channel IDs
    const channelIds = subscriptions.map(sub => sub.channel_id);
    console.log(`Found subscription channel IDs for user ${userId}:`, channelIds);
    
    // Now fetch the channel data separately
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds);
      
    if (channelsError) {
      console.error(`Error fetching channels for subscriptions (user ID ${userId}):`, channelsError);
      return res.status(500).json({ 
        success: false,
        message: "Error fetching channels for subscriptions", 
        error: channelsError.message,
        count: subscriptions.length,
        subscriptions: subscriptions 
      });
    }
    
    // Create a map of channel id to channel data
    const channelMap = {};
    if (channels) {
      channels.forEach(channel => {
        channelMap[channel.id] = channel;
      });
    }
    
    // Format the response to match what the frontend expects
    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      channel: channelMap[sub.channel_id] || null,
      channelId: sub.channel_id
    }));
    
    console.log(`Debug endpoint: Found ${formattedSubscriptions.length} subscriptions for user ID ${userId}`);
    
    return res.status(200).json({ 
      success: true,
      message: `Subscriptions found for user ID ${userId}`, 
      count: formattedSubscriptions.length,
      subscriptions: formattedSubscriptions
    });
  } catch (error) {
    console.error("Debug endpoint unexpected error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Unexpected error fetching subscriptions", 
      error: error.message,
      count: 0,
      subscriptions: []
    });
  }
});

// Add a diagnostic endpoint for checking the entire system
app.get("/api/debug/system", async (req, res) => {
  try {
    console.log("System diagnostic endpoint called");
    
    interface SystemDebugInfo {
      environment: string;
      timestamp: string;
      supabase: {
        url: string;
        serviceKeyPresent: boolean;
        anonKeyPresent: boolean;
      };
      vercel: {
        isVercel: boolean;
        environment: string | null;
        url: string | null;
        region: string | null;
      };
      database: {
        tables: {
          status: string;
          tableNames: string[] | null;
          error?: string;
        };
        counts: {
          users: { count: number | null; error?: string };
          channels: { count: number | null; error?: string };
          subscriptions: { count: number | null; error?: string };
        };
        sampleQueries: {
          userWithId3: { exists: boolean; error?: string };
          channelsForUser3: { count: number | null; error?: string };
          subscriptionsForUser3: { count: number | null; error?: string };
        };
        schemas: {
          users: { columns: string[] | null; error?: string };
          channels: { columns: string[] | null; error?: string };
          subscriptions: { columns: string[] | null; error?: string };
        };
      };
    }
    
    const diagnosticInfo: SystemDebugInfo = {
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      supabase: {
        url: supabaseUrl ? supabaseUrl.substring(0, 10) + '...' : 'missing',
        serviceKeyPresent: !!supabaseServiceKey,
        anonKeyPresent: !!supabaseAnonKey
      },
      vercel: {
        isVercel: process.env.VERCEL === '1',
        environment: process.env.VERCEL_ENV || null,
        url: process.env.VERCEL_URL || null,
        region: process.env.VERCEL_REGION || null
      },
      database: {
        tables: {
          status: 'pending',
          tableNames: null
        },
        counts: {
          users: { count: null },
          channels: { count: null },
          subscriptions: { count: null }
        },
        sampleQueries: {
          userWithId3: { exists: false },
          channelsForUser3: { count: null },
          subscriptionsForUser3: { count: null }
        },
        schemas: {
          users: { columns: null },
          channels: { columns: null },
          subscriptions: { columns: null }
        }
      }
    };
    
    // Test database schema access
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (tablesError) {
        diagnosticInfo.database.tables.status = 'error';
        diagnosticInfo.database.tables.error = tablesError.message;
      } else {
        diagnosticInfo.database.tables.status = 'success';
        diagnosticInfo.database.tables.tableNames = tables?.map(t => t.table_name) || [];
      }
    } catch (error) {
      diagnosticInfo.database.tables.status = 'exception';
      diagnosticInfo.database.tables.error = String(error);
    }
    
    // Check table counts
    try {
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (userError) {
        diagnosticInfo.database.counts.users.error = userError.message;
      } else {
        diagnosticInfo.database.counts.users.count = userCount;
      }
    } catch (error) {
      diagnosticInfo.database.counts.users.error = String(error);
    }
    
    try {
      const { count: channelCount, error: channelError } = await supabase
        .from('channels')
        .select('*', { count: 'exact', head: true });
      
      if (channelError) {
        diagnosticInfo.database.counts.channels.error = channelError.message;
      } else {
        diagnosticInfo.database.counts.channels.count = channelCount;
      }
    } catch (error) {
      diagnosticInfo.database.counts.channels.error = String(error);
    }
    
    try {
      const { count: subscriptionCount, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true });
      
      if (subscriptionError) {
        diagnosticInfo.database.counts.subscriptions.error = subscriptionError.message;
      } else {
        diagnosticInfo.database.counts.subscriptions.count = subscriptionCount;
      }
    } catch (error) {
      diagnosticInfo.database.counts.subscriptions.error = String(error);
    }
    
    // Check for user with ID 3
    try {
      const { data: user3, error: user3Error } = await supabase
        .from('users')
        .select('*')
        .eq('id', 3)
        .single();
      
      if (user3Error) {
        diagnosticInfo.database.sampleQueries.userWithId3.error = user3Error.message;
      } else {
        diagnosticInfo.database.sampleQueries.userWithId3.exists = !!user3;
      }
    } catch (error) {
      diagnosticInfo.database.sampleQueries.userWithId3.error = String(error);
    }
    
    // Check for channels with user_id 3
    try {
      const { count: channelsUser3Count, error: channelsUser3Error } = await supabase
        .from('channels')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', 3);
      
      if (channelsUser3Error) {
        diagnosticInfo.database.sampleQueries.channelsForUser3.error = channelsUser3Error.message;
      } else {
        diagnosticInfo.database.sampleQueries.channelsForUser3.count = channelsUser3Count;
      }
    } catch (error) {
      diagnosticInfo.database.sampleQueries.channelsForUser3.error = String(error);
    }
    
    // Check for subscriptions with user_id 3
    try {
      const { count: subscriptionsUser3Count, error: subscriptionsUser3Error } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', 3);
      
      if (subscriptionsUser3Error) {
        diagnosticInfo.database.sampleQueries.subscriptionsForUser3.error = subscriptionsUser3Error.message;
      } else {
        diagnosticInfo.database.sampleQueries.subscriptionsForUser3.count = subscriptionsUser3Count;
      }
    } catch (error) {
      diagnosticInfo.database.sampleQueries.subscriptionsForUser3.error = String(error);
    }
    
    // Get schema information
    try {
      const { data: usersColumns, error: usersColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'users')
        .eq('table_schema', 'public');
      
      if (usersColumnsError) {
        diagnosticInfo.database.schemas.users.error = usersColumnsError.message;
      } else {
        diagnosticInfo.database.schemas.users.columns = usersColumns?.map(c => c.column_name) || [];
      }
    } catch (error) {
      diagnosticInfo.database.schemas.users.error = String(error);
    }
    
    try {
      const { data: channelsColumns, error: channelsColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'channels')
        .eq('table_schema', 'public');
      
      if (channelsColumnsError) {
        diagnosticInfo.database.schemas.channels.error = channelsColumnsError.message;
      } else {
        diagnosticInfo.database.schemas.channels.columns = channelsColumns?.map(c => c.column_name) || [];
      }
    } catch (error) {
      diagnosticInfo.database.schemas.channels.error = String(error);
    }
    
    try {
      const { data: subscriptionsColumns, error: subscriptionsColumnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'subscriptions')
        .eq('table_schema', 'public');
      
      if (subscriptionsColumnsError) {
        diagnosticInfo.database.schemas.subscriptions.error = subscriptionsColumnsError.message;
      } else {
        diagnosticInfo.database.schemas.subscriptions.columns = subscriptionsColumns?.map(c => c.column_name) || [];
      }
    } catch (error) {
      diagnosticInfo.database.schemas.subscriptions.error = String(error);
    }
    
    return res.status(200).json(diagnosticInfo);
  } catch (error) {
    console.error('Error in system diagnostics endpoint:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error running system diagnostics', 
      error: String(error)
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
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// HARDCODED CREDENTIALS - use these directly without any environment variable references
const HARDCODED_SUPABASE_URL = 'https://mwrhaqghxatfwzsjjfrv.supabase.co';
const HARDCODED_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cmhhcWdoeGF0Znd6c2pqZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MTA3ODYsImV4cCI6MjA1NjA4Njc4Nn0.lFttNvmLpKXFRCq58bmn8OiVxnastEF7jWopx3CKa3M';

console.log('Creating Supabase client with hardcoded credentials');

// NEVER look at environment variables - use hardcoded values directly
let supabase: SupabaseClient | null = null;
try {
  supabase = createClient(HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY);
  console.log('Supabase client created successfully with hardcoded values');
  
  // Try to create helper functions to assist with joins
  createHelperFunctions()
    .catch(err => console.error('Error during helper function creation:', err));
    
} catch (error) {
  console.error('Error creating Supabase client:', error);
}

async function createHelperFunctions() {
  if (!supabase) return;

  // Try to create a stored function in Supabase that we can use to get articles with channels
  try {
    // This SQL will create a function in Supabase that does the join for us
    const { error } = await supabase.rpc('create_articles_join_function', {
      sql_function: `
        CREATE OR REPLACE FUNCTION public.get_articles_with_channels()
        RETURNS SETOF json AS $$
        BEGIN
          RETURN QUERY 
          SELECT 
            json_build_object(
              'id', a.id,
              'title', a.title,
              'content', a.content,
              'channel_id', a.channel_id,
              'user_id', a.user_id,
              'category', a.category,
              'location', a.location,
              'published', a.published,
              'created_at', a.created_at,
              'status', a.status,
              'last_edited', a.last_edited,
              'published_at', a.published_at,
              'view_count', a.view_count,
              'location_id', a.location_id,
              'channel', CASE 
                WHEN c.id IS NOT NULL THEN 
                  json_build_object('id', c.id, 'name', c.name)
                ELSE NULL
              END
            )
          FROM 
            public.articles a
          LEFT JOIN 
            public.channels c ON a.channel_id = c.id
          ORDER BY 
            a.created_at DESC;
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('Error creating stored function:', error);
    } else {
      console.log('Successfully created/updated the stored function');
    }
  } catch (e) {
    console.error('Exception while creating helper function:', e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Basic routing based on the path
  const path = req.url?.split('?')[0] || '';
  
  try {
    if (path.startsWith('/api/user')) {
      return await handleUser(req, res);
    } else if (path.startsWith('/api/channels')) {
      return await handleChannels(req, res);
    } else if (path.startsWith('/api/articles')) {
      return await handleArticles(req, res);
    } else if (path.startsWith('/api/debug-articles')) {
      return await debugArticles(req, res);
    } else if (path.startsWith('/api/init-db')) {
      return await initDatabase(req, res);
    } else if (path.startsWith('/api/logout')) {
      return await handleLogout(req, res);
    } else if (path.startsWith('/api/login')) {
      return await handleLogin(req, res);
    } else {
      // Default response for unknown routes
      return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error(`Error handling ${path}:`, error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      path
    });
  }
}

// Handler for /api/user
async function handleUser(req: VercelRequest, res: VercelResponse) {
  // Return 401 when not authenticated (standard behavior)
  return res.status(401).json({
    error: "Unauthorized",
    message: "You must be logged in to access this resource"
  });
}

// Handler for /api/channels
async function handleChannels(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    console.error('Supabase client not initialized in channels handler');
    return res.status(500).json({ 
      error: 'Supabase client not initialized',
      supabaseStatus: 'not initialized',
      url: req.url
    });
  }
  
  try {
    console.log('Fetching channels from Supabase...');
    const { data, error } = await supabase.from('channels').select('*').order('name');
    
    if (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data?.length || 0} channels`);
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error in handleChannels:', error);
    return res.status(500).json({
      error: 'Error fetching channels',
      message: error instanceof Error ? error.message : String(error),
      url: req.url
    });
  }
}

// Handler for /api/articles
async function handleArticles(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    console.error('Supabase client not initialized in articles handler');
    return res.status(500).json({ 
      error: 'Supabase client not initialized',
      supabaseStatus: 'not initialized',
      url: req.url
    });
  }
  
  // Extract path to check if it's a request for a specific article
  const path = req.url?.split('?')[0] || '';
  const matches = path.match(/\/api\/articles\/(\d+)/);
  
  // If this is a request for a specific article by ID
  if (matches && matches[1]) {
    const articleId = parseInt(matches[1], 10);
    console.log(`Fetching single article with ID: ${articleId}`);
    
    try {
      // Try different approaches to fetch a single article
      
      // Approach 1: Try standard join with ID filter
      try {
        const { data, error } = await supabase
          .from('articles')
          .select(`
            *,
            channel:channels(id, name)
          `)
          .eq('id', articleId)
          .single();
          
        if (!error && data) {
          console.log(`Success fetching article #${articleId} with standard join`);
          return res.status(200).json(data);
        }
        
        console.log(`Error fetching article #${articleId} with standard join:`, error?.message);
      } catch (e) {
        console.error('Exception in article fetch with join:', e);
      }
      
      // Approach 2: Get the article and channel separately and join manually
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
        
      if (articleError) {
        console.error(`Error fetching article #${articleId}:`, articleError);
        return res.status(404).json({ 
          error: 'Article not found',
          details: articleError
        });
      }
      
      // If we have an article with a channel_id, fetch its channel
      if (article && article.channel_id) {
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('id, name')
          .eq('id', article.channel_id)
          .single();
          
        // Return the article with its channel
        return res.status(200).json({
          ...article,
          channel: channelError ? null : channel
        });
      }
      
      // If no channel_id or couldn't fetch channel, return just the article
      return res.status(200).json(article);
    } catch (error) {
      console.error(`Error fetching article #${articleId}:`, error);
      return res.status(500).json({
        error: 'Error fetching article',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  // Otherwise, this is a request for all articles, proceed with existing logic
  try {
    console.log('Fetching articles with multi-approach method...');
    
    // Try multiple approaches in order of preference
    
    // Approach 1: Try using the stored function if available
    try {
      console.log('Attempt 1: Using stored function...');
      const { data, error } = await supabase.rpc('get_articles_with_channels');
      
      // If this works, return the data immediately
      if (!error && data) {
        console.log(`Success with stored function! Got ${data.length} articles.`);
        return res.status(200).json(data);
      }
      
      console.log('Stored function failed:', error?.message || 'Unknown error');
    } catch (e) {
      console.log('Exception during stored function call:', e);
    }
    
    // Approach 2: Try the standard join (this works in local development)
    try {
      console.log('Attempt 2: Using standard Supabase join...');
      const { data, error } = await supabase.from('articles').select(`
        *,
        channel:channels(id, name)
      `).order('created_at', { ascending: false });
      
      if (!error && data) {
        console.log(`Success with standard join! Got ${data.length} articles.`);
        return res.status(200).json(data);
      }
      
      console.log('Standard join failed:', error?.message || 'Unknown error');
    } catch (e) {
      console.log('Exception during standard join:', e);
    }
    
    // Approach 3: Manual join as fallback (guaranteed to work if tables exist)
    console.log('Attempt 3: Using manual join (fetch articles and channels separately)...');
    
    // Get all articles
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      return res.status(500).json({
        error: 'Error fetching articles',
        message: articlesError.message
      });
    }
    
    // Get all channels for the manual join
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*');
    
    if (channelsError) {
      console.error('Error fetching channels for manual join:', channelsError);
      // If we can't get channels, return just the articles
      return res.status(200).json(articles);
    }
    
    // Create a map for quick channel lookup
    const channelMap = channels ? channels.reduce((map, channel) => {
      map[channel.id] = channel;
      return map;
    }, {}) : {};
    
    // Manually join the data
    const articlesWithChannels = articles.map(article => ({
      ...article,
      channel: article.channel_id && channelMap[article.channel_id] 
        ? { id: channelMap[article.channel_id].id, name: channelMap[article.channel_id].name } 
        : null
    }));
    
    console.log(`Manual join successful! Returning ${articlesWithChannels.length} articles with channels.`);
    return res.status(200).json(articlesWithChannels);
  } catch (error) {
    console.error('Error in handleArticles:', error);
    return res.status(500).json({
      error: 'Error fetching articles',
      message: error instanceof Error ? error.message : String(error),
      url: req.url
    });
  }
}

// Special debug handler for articles
async function debugArticles(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized' });
  }
  
  try {
    console.log('Running enhanced debug articles queries...');
    
    // Add this - get the Supabase client version and details
    let clientInfo = {};
    try {
      // Use safer way to check if the client is initialized
      clientInfo = {
        clientInitialized: !!supabase,
        // Don't try to access protected properties directly
        clientType: supabase ? 'SupabaseClient' : 'null',
        schema: 'public', // Default Supabase schema
        apiVersion: '1', // Default API version
        restUrl: `${HARDCODED_SUPABASE_URL}/rest/v1`
      };
    } catch (e) {
      clientInfo = { error: String(e) };
    }
    
    // Try different queries to see which ones work
    const results = {
      // Add Supabase client info
      clientInfo,
      
      // Additional test: Try a custom raw query that mimics the join
      rawQuery: await runSafeQuery(async () => {
        // Use a raw SQL query to test if the issue is with the Supabase query builder
        const { data, error } = await supabase.rpc('get_articles_with_channels', {});
        return { data, error };
      }),
      
      // Separate query to check permissions
      articleCount: await runSafeQuery(() => 
        supabase.from('articles').select('id', { count: 'exact' })
      ),
      
      // Test 1: Simple selection
      simpleSelect: await runSafeQuery(() => 
        supabase.from('articles').select('*').limit(1)
      ),
      
      // Test 2: Check if the channels relation works
      channelsTest: await runSafeQuery(() => 
        supabase.from('channels').select('*').limit(1)
      ),
      
      // Try a raw SQL join version
      manualJoin: await runSafeQuery(async () => {
        const { data: articles, error: articlesError } = await supabase
          .from('articles')
          .select('*')
          .limit(1);
          
        if (articlesError || !articles || articles.length === 0) {
          return { error: articlesError || 'No articles found' };
        }
        
        const article = articles[0];
        
        if (!article.channel_id) {
          return { data: [{ ...article, channel: null }] };
        }
        
        const { data: channel, error: channelError } = await supabase
          .from('channels')
          .select('id, name')
          .eq('id', article.channel_id)
          .single();
          
        if (channelError) {
          return { data: [{ ...article, channel: null }], error: channelError };
        }
        
        return { data: [{ ...article, channel }] };
      }),
      
      // Test 3: Try the join but with limited fields
      simpleJoin: await runSafeQuery(() => 
        supabase.from('articles').select('id, title, channel:channels(id)').limit(1)
      ),
      
      // Test 4: Full query with proper error capture
      fullQuery: await runSafeQuery(() => 
        supabase.from('articles').select(`
          *,
          channel:channels(id, name)
        `).order('created_at', { ascending: false }).limit(1)
      ),
      
      // Include connection info
      connectionStatus: {
        supabaseInitialized: !!supabase,
        url: HARDCODED_SUPABASE_URL
      },
      
      // Add request headers for debugging
      requestHeaders: req.headers,
      
      // Add environment info for debugging
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        region: process.env.VERCEL_REGION,
        isProduction: process.env.NODE_ENV === 'production'
      }
    };
    
    // Add a function to create the Supabase RPC function if it doesn't exist
    try {
      // This will create a stored procedure in Supabase that does the join
      await supabase.rpc('create_get_articles_function', {});
    } catch (e) {
      console.log('Failed to create RPC function:', e);
      // Ignore errors as this is just a helper
    }
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in debug articles:', error);
    return res.status(500).json({ 
      error: 'Debug articles error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Special handler to initialize the database
async function initDatabase(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized' });
  }
  
  const results = {
    steps: [] as { name: string; success: boolean; message?: string }[]
  };
  
  try {
    // Step 1: Create the function
    try {
      const { error } = await supabase.rpc('create_helper_function', {
        sql: `
          -- This is a function to help with Supabase permissions
          CREATE OR REPLACE FUNCTION create_articles_join_function(sql_function TEXT)
          RETURNS void AS $$
          BEGIN
            EXECUTE sql_function;
          END;
          $$ LANGUAGE plpgsql;
          
          -- Grant permissions
          GRANT EXECUTE ON FUNCTION create_articles_join_function TO anon, authenticated, service_role;
        `
      });
      
      results.steps.push({
        name: 'Create helper function',
        success: !error,
        message: error ? error.message : 'Success'
      });
    } catch (e) {
      results.steps.push({
        name: 'Create helper function',
        success: false,
        message: e instanceof Error ? e.message : String(e)
      });
    }
    
    // Step 2: Create the articles-channels join function
    await createHelperFunctions();
    results.steps.push({
      name: 'Create join function',
      success: true,
      message: 'Attempted to create (see logs for details)'
    });
    
    // Step 3: Test the functions
    try {
      const { data, error } = await supabase.rpc('get_articles_with_channels');
      results.steps.push({
        name: 'Test join function',
        success: !error,
        message: error ? error.message : `Success, found ${data?.length || 0} articles`
      });
    } catch (e) {
      results.steps.push({
        name: 'Test join function',
        success: false,
        message: e instanceof Error ? e.message : String(e)
      });
    }
    
    return res.status(200).json({
      message: 'Database initialization completed',
      results
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return res.status(500).json({ 
      error: 'Error initializing database', 
      message: error instanceof Error ? error.message : String(error),
      results
    });
  }
}

// Add a logout handler
async function handleLogout(req: VercelRequest, res: VercelResponse) {
  console.log('Logout request received');
  try {
    // For Supabase auth
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signout error:', error);
      }
    }
    
    // Always return success even if there's an error with Supabase
    // This ensures the frontend can clear its state
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    // Still return success to allow frontend to clear state
    return res.status(200).json({ success: true, message: 'Logged out with errors' });
  }
}

// Add a minimal login handler for testing
async function handleLogin(req: VercelRequest, res: VercelResponse) {
  console.log('Login request received', req.body);
  
  // Return a dummy user to make testing easier
  return res.status(200).json({
    id: 1,
    username: req.body?.username || 'user',
    description: 'Test user',
    supabase_uid: 'test',
    created_at: new Date()
  });
}

// Helper to safely run queries and capture errors
async function runSafeQuery(queryFn) {
  try {
    const { data, error } = await queryFn();
    return {
      success: !error,
      data: data || null,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details
      } : null
    };
  } catch (e) {
    return {
      success: false,
      data: null,
      error: {
        message: e instanceof Error ? e.message : String(e),
        type: 'exception'
      }
    };
  }
} 
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly in the handler
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

console.log('Supabase URL exists:', !!supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

let supabase: ReturnType<typeof createClient> | null = null;

try {
  if (supabaseUrl && supabaseKey) {
    console.log(`Attempting to initialize Supabase client with URL: ${supabaseUrl.substring(0, 8)}...`);
    
    // Use Supabase's REST API instead of direct database connections
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        // Set database-related options
        headers: {
          // Add any custom headers required for your setup
        },
      },
    });
    
    console.log('Supabase client initialized successfully');
  } else {
    console.error('Supabase URL or key missing - check Vercel environment variables');
    if (!supabaseUrl) console.error('SUPABASE_URL is missing');
    if (!supabaseKey) console.error('SUPABASE_SERVICE_KEY is missing');
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
}

// Mock data for demo purposes
const MOCK_ARTICLES = [
  {
    id: 1,
    title: "Introduction to the News Platform",
    content: "Welcome to our demo news platform! This is a sample article that shows how the system works.",
    channel_id: 1,
    user_id: 999,
    category: "Technology",
    published: true,
    created_at: new Date().toISOString(),
    status: "published",
    location: "Global",
    view_count: 42
  },
  {
    id: 2,
    title: "Getting Started with Web Development",
    content: "Learning web development can be challenging but rewarding. Start with HTML, CSS, and JavaScript.",
    channel_id: 2,
    user_id: 999,
    category: "Programming",
    published: true,
    created_at: new Date().toISOString(),
    status: "published",
    location: "Online",
    view_count: 128
  }
];

const MOCK_CHANNELS = [
  {
    id: 1,
    name: "Technology Today",
    description: "Latest news and updates from the tech world",
    user_id: 999,
    category: "Technology",
    subscriberCount: 15
  },
  {
    id: 2,
    name: "Programming Tips",
    description: "Tips and tricks for developers",
    user_id: 999,
    category: "Programming",
    subscriberCount: 8
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get current URL for logging
  const url = req.url || '';
  console.log(`[Vercel API] ${req.method} ${url}`);

  // Check if Supabase is initialized at request time
  if (!supabase) {
    return res.status(500).json({ 
      error: 'Supabase client not initialized',
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      help: 'Please check environment variables in Vercel dashboard'
    });
  }

  // Basic routing based on the path
  const path = url.split('?')[0] || '';
  
  try {
    if (path.startsWith('/api/user')) {
      return await handleUser(req, res);
    } else if (path.startsWith('/api/channels')) {
      return await handleChannels(req, res);
    } else if (path.startsWith('/api/articles')) {
      return await handleArticles(req, res);
    } else {
      // Default response for unknown routes
      return res.status(404).json({ error: 'Not found', path });
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
  // Since we can't use sessions easily in serverless, return a guest user for now
  return res.status(200).json({
    id: 999,
    username: 'demo_user',
    isGuest: true
  });
}

// Handler for /api/channels
async function handleChannels(req: VercelRequest, res: VercelResponse) {
  try {
    // Make a test query first to verify the connection
    console.log('Testing Supabase connection in /api/channels...');
    
    const { data, error } = await supabase!.from('channels').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return res.status(500).json({ 
        error: 'Supabase connection failed',
        details: error.message,
        code: error.code 
      });
    }
    
    console.log('Supabase connection test successful, fetching channels');
    
    // If test passed, make the real query
    const { data: channels, error: channelsError } = await supabase!.from('channels').select('*').order('name');
    
    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return res.status(500).json({ 
        error: 'Failed to fetch channels',
        details: channelsError.message,
        code: channelsError.code 
      });
    }
    
    return res.status(200).json(channels || []);
  } catch (error) {
    console.error('Unexpected error in handleChannels:', error);
    return res.status(500).json({ 
      error: 'Unexpected error in handleChannels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Handler for /api/articles
async function handleArticles(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('Testing Supabase connection in /api/articles...');
    
    // Test connection first
    const { data: testData, error: testError } = await supabase!.from('articles').select('count').limit(1);
    
    if (testError) {
      console.error('Supabase connection test failed:', testError);
      return res.status(500).json({ 
        error: 'Supabase connection failed',
        details: testError.message,
        code: testError.code 
      });
    }
    
    console.log('Supabase connection test successful, fetching articles');
    
    // Make the real query
    const { data: articles, error: articlesError } = await supabase!
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    
    if (articlesError) {
      console.error('Error fetching articles:', articlesError);
      return res.status(500).json({ 
        error: 'Failed to fetch articles',
        details: articlesError.message,
        code: articlesError.code 
      });
    }
    
    return res.status(200).json(articles || []);
  } catch (error) {
    console.error('Unexpected error in handleArticles:', error);
    return res.status(500).json({ 
      error: 'Unexpected error in handleArticles',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 
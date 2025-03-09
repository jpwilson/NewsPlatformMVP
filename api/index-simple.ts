import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly in the handler
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized successfully');
  } else {
    console.log('Supabase URL or key missing, using mock data');
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
    // If we have a working Supabase client, try to use it
    if (supabase) {
      try {
        const { data, error } = await supabase.from('channels').select('*').order('name');
        
        if (!error && data && data.length > 0) {
          return res.status(200).json(data);
        }
        // If error or no data, fall through to mock data
      } catch (error) {
        console.log('Error fetching from Supabase, using mock data:', error);
      }
    }
    
    // Return mock data if Supabase failed or isn't initialized
    console.log('Returning mock channels data');
    return res.status(200).json(MOCK_CHANNELS);
  } catch (error) {
    console.error('Error in handleChannels:', error);
    return res.status(200).json(MOCK_CHANNELS); // Always return something usable
  }
}

// Handler for /api/articles
async function handleArticles(req: VercelRequest, res: VercelResponse) {
  try {
    // If we have a working Supabase client, try to use it
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          return res.status(200).json(data);
        }
        // If error or no data, fall through to mock data
      } catch (error) {
        console.log('Error fetching from Supabase, using mock data:', error);
      }
    }
    
    // Return mock data if Supabase failed or isn't initialized
    console.log('Returning mock articles data');
    return res.status(200).json(MOCK_ARTICLES);
  } catch (error) {
    console.error('Error in handleArticles:', error);
    return res.status(200).json(MOCK_ARTICLES); // Always return something usable
  }
} 
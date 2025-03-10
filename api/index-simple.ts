import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials - use fallbacks for development and deployment
const FALLBACK_SUPABASE_URL = 'https://mwrhaqghxatfwzsjjfrv.supabase.co';
const FALLBACK_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cmhhcWdoeGF0Znd6c2pqZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MTA3ODYsImV4cCI6MjA1NjA4Njc4Nn0.lFttNvmLpKXFRCq58bmn8OiVxnastEF7jWopx3CKa3M';

// Check environment variables and use fallbacks if needed
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_KEY;

console.log('Supabase initialization:', { 
  urlProvided: !!supabaseUrl, 
  keyProvided: !!supabaseKey,
  usingFallbackUrl: supabaseUrl === FALLBACK_SUPABASE_URL,
  usingFallbackKey: supabaseKey === FALLBACK_SUPABASE_KEY
});

let supabase: ReturnType<typeof createClient> | null = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');
  } else {
    console.error('Missing Supabase credentials');
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
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
    return res.status(500).json({ error: 'Supabase client not initialized' });
  }
  
  try {
    const { data, error } = await supabase.from('channels').select('*').order('name');
    
    if (error) throw error;
    
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return res.status(500).json({ error: 'Failed to fetch channels' });
  }
}

// Handler for /api/articles
async function handleArticles(req: VercelRequest, res: VercelResponse) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized' });
  }
  
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return res.status(500).json({ error: 'Failed to fetch articles' });
  }
} 
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client directly in the handler
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
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
  // Since we can't use sessions easily in serverless, return a guest user for now
  return res.status(200).json({
    id: 0,
    username: 'guest',
    isGuest: true
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
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
  
  try {
    console.log('Fetching articles from Supabase...');
    const { data, error } = await supabase.from('articles').select(`
      *,
      channel:channels(id, name)
    `).order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching articles:', error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data?.length || 0} articles`);
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Error in handleArticles:', error);
    return res.status(500).json({
      error: 'Error fetching articles',
      message: error instanceof Error ? error.message : String(error),
      url: req.url
    });
  }
} 
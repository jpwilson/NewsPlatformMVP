import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Direct hardcoded values for testing connection
const SUPABASE_URL = 'https://mwrhaqghxatfwzsjjfrv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cmhhcWdoeGF0Znd6c2pqZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MTA3ODYsImV4cCI6MjA1NjA4Njc4Nn0.lFttNvmLpKXFRCq58bmn8OiVxnastEF7jWopx3CKa3M';

export default async function debug(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Always allow access in production for debugging
  
  // Safe display of environment variables (hide secrets)
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV || 'Not set',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set (value hidden)' : 'Not set',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set (value hidden)' : 'Not set',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'Set (value hidden)' : 'Not set',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'Set (value hidden)' : 'Not set',
    VERCEL_URL: process.env.VERCEL_URL || 'Not set',
    VERCEL_ENV: process.env.VERCEL_ENV || 'Not set',
  };
  
  // Test Supabase connection
  let supabaseTest = null;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data, error } = await supabase.from('channels').select('count');
    supabaseTest = { 
      connected: !error,
      error: error ? String(error) : null,
      data: data || null,
      message: error ? 'Failed to connect to Supabase' : 'Successfully connected to Supabase'
    };
  } catch (error) {
    supabaseTest = {
      connected: false,
      error: String(error),
      message: 'Exception while connecting to Supabase'
    };
  }
  
  return res.status(200).json({
    envInfo,
    headers: req.headers,
    timestamp: new Date().toISOString(),
    url: req.url,
    supabaseTest
  });
} 
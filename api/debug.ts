import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Log the request for debugging
  console.log(`[Debug API] ${req.method} ${req.url}`);

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return environment information for debugging
  return res.status(200).json({
    success: true,
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString(),
    deployment: {
      platform: 'Vercel',
      region: process.env.VERCEL_REGION || 'unknown',
      env: process.env.NODE_ENV || 'unknown',
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
      hasSupabaseDatabaseUrl: !!process.env.SUPABASE_DATABASE_URL,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      // Don't expose actual values, just whether they exist
    },
    request: {
      method: req.method,
      url: req.url,
      host: req.headers.host,
      query: req.query,
    }
  });
} 
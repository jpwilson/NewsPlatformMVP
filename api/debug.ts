import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function debug(req: VercelRequest, res: VercelResponse) {
  // Only show this in development or with a special header
  const isAllowed = process.env.NODE_ENV === 'development' || 
                   req.headers['x-debug-token'] === 'super-secret-token';
  
  if (!isAllowed) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  // Safe display of environment variables (hide secrets)
  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    SUPABASE_URL: process.env.SUPABASE_URL ? 'Set (value hidden)' : 'Not set',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'Set (value hidden)' : 'Not set',
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? 'Set (value hidden)' : 'Not set',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'Set (value hidden)' : 'Not set',
    // Include other relevant variables
    VERCEL_URL: process.env.VERCEL_URL || 'Not set',
    VERCEL_ENV: process.env.VERCEL_ENV || 'Not set',
  };
  
  return res.status(200).json({
    envInfo,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
} 
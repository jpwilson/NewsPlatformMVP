import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('Starting database connectivity test');
  
  const startTime = Date.now();
  
  // 1. Check if environment variables exist
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Missing environment variables',
      variables: {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_KEY: !!supabaseKey
      },
      allEnvKeys: Object.keys(process.env).filter(key => 
        !key.includes('TOKEN') && 
        !key.includes('SECRET') && 
        !key.includes('KEY') &&
        !key.includes('PASSWORD')).sort()
    });
  }
  
  let supabase: ReturnType<typeof createClient>;
  
  try {
    // 2. Create Supabase client
    console.log('Creating Supabase client');
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // 3. Test with a simple query
    console.log('Testing connection with query');
    const { data, error } = await supabase.from('channels').select('count');
    
    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        details: error,
        connectionDetails: {
          supabaseUrlProvided: !!supabaseUrl,
          supabaseKeyProvided: !!supabaseKey,
          supabaseUrlLength: supabaseUrl?.length || 0,
          supabaseKeyLength: supabaseKey?.length || 0
        }
      });
    }
    
    // 4. Return success
    const duration = Date.now() - startTime;
    console.log(`Database connection test successful (${duration}ms)`);
    
    return res.status(200).json({
      success: true,
      message: 'Successfully connected to Supabase',
      data,
      region: process.env.VERCEL_REGION || 'unknown',
      duration: `${duration}ms`
    });
    
  } catch (error) {
    console.error('Unexpected error during database test:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
} 
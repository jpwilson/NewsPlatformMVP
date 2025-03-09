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
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Missing environment variables',
      variables: {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_KEY: !!supabaseKey,
        VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
      },
      allEnvKeys: Object.keys(process.env).filter(key => 
        !key.includes('TOKEN') && 
        !key.includes('SECRET') && 
        !key.includes('KEY') &&
        !key.includes('PASSWORD')).sort()
    });
  }
  
  let supabase: ReturnType<typeof createClient>;
  const results: any[] = [];
  
  try {
    // 2. Create Supabase client
    console.log('Creating Supabase client');
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // 3. Test with multiple queries to diagnose different issues
    
    // Test 1: Simple health check
    console.log('Test 1: Basic health check');
    try {
      const { data: healthData, error: healthError } = await supabase.from('channels').select('count');
      results.push({
        test: 'Basic health check',
        success: !healthError,
        error: healthError ? healthError.message : null,
        data: healthData
      });
      
      if (healthError) {
        console.error('Health check failed:', healthError);
      }
    } catch (error) {
      console.error('Health check threw exception:', error);
      results.push({
        test: 'Basic health check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Test 2: Test authenticated access
    console.log('Test 2: Auth check');
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      results.push({
        test: 'Auth check',
        success: !authError,
        error: authError ? authError.message : null,
        data: authData ? 'Session data (redacted)' : null
      });
      
      if (authError) {
        console.error('Auth check failed:', authError);
      }
    } catch (error) {
      console.error('Auth check threw exception:', error);
      results.push({
        test: 'Auth check',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Test 3: Test read access
    console.log('Test 3: Read access');
    try {
      // Try to read channels (should be public)
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .limit(1);
      
      results.push({
        test: 'Read access to channels',
        success: !channelsError && Array.isArray(channelsData),
        error: channelsError ? channelsError.message : null,
        data: channelsData ? `Found ${channelsData.length} channels` : null
      });
      
      if (channelsError) {
        console.error('Channels read access failed:', channelsError);
      }
    } catch (error) {
      console.error('Read access threw exception:', error);
      results.push({
        test: 'Read access to channels',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // 4. Return all results
    const duration = Date.now() - startTime;
    console.log(`Database tests completed in ${duration}ms`);
    
    const overallSuccess = results.every(r => r.success);
    
    return res.status(overallSuccess ? 200 : 500).json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'All Supabase tests passed' 
        : 'Some Supabase tests failed - see results for details',
      results,
      region: process.env.VERCEL_REGION || 'unknown',
      duration: `${duration}ms`,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
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
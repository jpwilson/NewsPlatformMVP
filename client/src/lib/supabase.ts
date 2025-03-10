import { createClient } from '@supabase/supabase-js'

// Fallback values as a last resort
const FALLBACK_SUPABASE_URL = 'https://mwrhaqghxatfwzsjjfrv.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13cmhhcWdoeGF0Znd6c2pqZnJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MTA3ODYsImV4cCI6MjA1NjA4Njc4Nn0.lFttNvmLpKXFRCq58bmn8OiVxnastEF7jWopx3CKa3M';

// Get environment variables with fallback 
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

console.log('Client Supabase initialization:', { 
  urlProvided: !!supabaseUrl, 
  keyProvided: !!supabaseAnonKey,
  usingFallbackUrl: supabaseUrl === FALLBACK_SUPABASE_URL,
  usingFallbackKey: supabaseAnonKey === FALLBACK_SUPABASE_ANON_KEY
});

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: 'pkce',
    }
  }
); 
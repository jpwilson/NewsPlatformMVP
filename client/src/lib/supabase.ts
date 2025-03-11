import { createClient } from '@supabase/supabase-js'

// Log the environment variables for debugging (remove in production)
console.log('VITE_SUPABASE_URL exists:', !!import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if values are missing and log a helpful error
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

// Get the current domain for auth redirects
const domain = typeof window !== 'undefined' ? window.location.origin : '';
console.log('Current domain for auth redirects:', domain);

// Check if we're running in production (Vercel) or development
const isProduction = import.meta.env.PROD;
console.log('Running in production mode:', isProduction);

// Create client with appropriate settings based on environment
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Use implicit flow for both environments to ensure consistency
    flowType: 'implicit',
    storage: {
      getItem: (key) => {
        try {
          const storedSession = globalThis.localStorage?.getItem(key);
          console.log(`Retrieved session from localStorage: ${key} ${storedSession ? '✓' : '✗'}`);
          return storedSession;
        } catch (error) {
          console.error('Error accessing localStorage:', error);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          globalThis.localStorage?.setItem(key, value);
          console.log(`Stored session in localStorage: ${key} ✓`);
        } catch (error) {
          console.error('Error setting localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          globalThis.localStorage?.removeItem(key);
          console.log(`Removed session from localStorage: ${key} ✓`);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      },
    },
  }
});

// Add event listener for auth state changes (debugging)
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth state changed:', event, session ? '✓ Session exists' : '✗ No session');
}); 
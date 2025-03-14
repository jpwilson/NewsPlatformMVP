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
  if (session) {
    console.log('User ID:', session.user.id);
    console.log('Access token exists:', !!session.access_token);
  }
});

// Utility function to get current session with error handling
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return data.session;
  } catch (error) {
    console.error('Unexpected error getting session:', error);
    return null;
  }
}

// Utility function to check if user is authenticated
export async function isAuthenticated() {
  const session = await getCurrentSession();
  return !!session;
}

// Debug function to help troubleshoot authentication issues
export async function debugAuthState() {
  console.group('Debug Auth State');
  try {
    // Check session
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Session exists:', !!sessionData.session);
    
    if (sessionData.session) {
      console.log('User ID:', sessionData.session.user.id);
      console.log('Token expiry:', new Date(sessionData.session.expires_at! * 1000).toISOString());
      console.log('Is expired:', Date.now() > sessionData.session.expires_at! * 1000);
    }
    
    // Check localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage).filter(key => key.includes('supabase'));
      console.log('Supabase localStorage keys:', keys);
      
      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          console.log(`${key}: ${value ? '✓ Has value' : '✗ Empty'}`);
        } catch (e) {
          console.error(`Error reading ${key}:`, e);
        }
      });
    }
  } catch (error) {
    console.error('Error in debugAuthState:', error);
  }
  console.groupEnd();
}

// Call debug function on load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(debugAuthState, 1000); // Delay to let auth initialize
  });
} 
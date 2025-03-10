// Direct Supabase client for API routes
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Log availability of environment variables (don't log actual values)
console.log("Supabase client initializing");
console.log("Has SUPABASE_URL:", !!supabaseUrl);
console.log("Has SUPABASE_SERVICE_KEY:", !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in API handler');
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey); 
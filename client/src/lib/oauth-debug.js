/**
 * OAuth Debug Utility
 * 
 * This file contains utilities to help debug OAuth redirect issues
 * It doesn't modify the actual application behavior but adds logging
 */

// Log the current hostname and origin every time the page loads
(function() {
  console.log('[OAuth Debug] Page loaded at:', {
    hostname: window.location.hostname,
    origin: window.location.origin,
    protocol: window.location.protocol,
    pathname: window.location.pathname,
    search: window.location.search,
    href: window.location.href
  });
  
  // Check if this is being loaded on a Vercel domain
  const isVercelDomain = window.location.hostname.includes('vercel.app');
  console.log('[OAuth Debug] Is Vercel domain:', isVercelDomain);
  
  // Add listener for storage events (for debugging redirect issues)
  window.addEventListener('storage', (event) => {
    console.log('[OAuth Debug] Storage event:', event);
  });
  
  // Capture the original Google OAuth redirect
  const originalSignInWithOAuth = window.supabase?.auth?.signInWithOAuth;
  if (originalSignInWithOAuth) {
    window.supabase.auth.signInWithOAuth = function(params) {
      console.log('[OAuth Debug] Signing in with OAuth:', params);
      console.log('[OAuth Debug] Redirect URL:', params.options?.redirectTo);
      
      // Don't modify behavior, just log it
      return originalSignInWithOAuth.apply(this, arguments);
    };
    console.log('[OAuth Debug] Patched signInWithOAuth for debugging');
  } else {
    console.log('[OAuth Debug] Could not patch signInWithOAuth, not available yet');
    
    // Try again when document is fully loaded
    document.addEventListener('DOMContentLoaded', () => {
      const recheck = window.supabase?.auth?.signInWithOAuth;
      if (recheck) {
        console.log('[OAuth Debug] Found signInWithOAuth on DOMContentLoaded');
      } else {
        console.log('[OAuth Debug] signInWithOAuth still not available on DOMContentLoaded');
      }
    });
  }
})(); 
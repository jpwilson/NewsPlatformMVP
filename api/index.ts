import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import "dotenv/config";

// Create Express app
const app = express();

// Debug logs for deployment
console.log("API Handler initializing");
console.log("Environment:", process.env.NODE_ENV);
console.log("Has SUPABASE_URL:", !!process.env.SUPABASE_URL);
console.log("Has SUPABASE_SERVICE_KEY:", !!process.env.SUPABASE_SERVICE_KEY);

// Setup Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS handling
app.use((req, res, next) => {
  // Set appropriate CORS headers for production
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Import and register routes
let registerRoutes;
try {
  const { registerRoutes: localRoutes } = require('./routes');
  registerRoutes = localRoutes;
  console.log("Successfully imported routes with require");
} catch (error) {
  console.error("Failed to import routes with require:", error);
  
  // Fallback to dynamic import
  import('./routes').then(module => {
    console.log("Successfully imported routes with dynamic import");
    registerRoutes = module.registerRoutes;
    if (registerRoutes) {
      try {
        registerRoutes(app);
        console.log("Routes registered successfully with dynamic import");
      } catch (error) {
        console.error("Error registering routes with dynamic import:", error);
      }
    }
  }).catch(error => {
    console.error("Failed to import routes with dynamic import:", error);
  });
}

// Register routes if available from require
if (registerRoutes) {
  try {
    registerRoutes(app);
    console.log("Routes registered successfully");
  } catch (error) {
    console.error("Error registering routes:", error);
  }
}

// Fallback routes for essential endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    fallback: true 
  });
});

app.get('/api/channels', async (req, res) => {
  // If this route is hit, the regular routes weren't registered
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase.from('channels').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Fallback channels error:", error);
    res.status(500).json({ error: "Failed to fetch channels in fallback route" });
  }
});

app.get('/api/articles', async (req, res) => {
  // If this route is hit, the regular routes weren't registered
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Fallback articles error:", error);
    res.status(500).json({ error: "Failed to fetch articles in fallback route" });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error(err);
});

// Handle all API routes
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("API request received:", req.method, req.url);
  
  // Forward to express app
  return new Promise((resolve) => {
    // Create a custom middleware to handle the request
    const handleRequest = (req: any, res: any) => {
      app(req, res, () => {
        resolve(undefined);
      });
    };
    
    handleRequest(req, res);
  });
} 
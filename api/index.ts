import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import "dotenv/config";
import * as fs from 'fs';
import * as path from 'path';

// Debug logs for deployment
console.log("API Handler initializing");
console.log("Current directory:", process.cwd());
console.log("Files in current directory:", fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : "Cannot read directory");
console.log("Server directory exists:", fs.existsSync(path.join(process.cwd(), 'server')));
console.log("Server/routes exists:", fs.existsSync(path.join(process.cwd(), 'server/routes.js')));
console.log("Server/routes.ts exists:", fs.existsSync(path.join(process.cwd(), 'server/routes.ts')));

// Try importing with dynamic import to provide better error handling
let registerRoutes;
try {
  // Try to dynamically import routes
  console.log("Attempting to import server/routes");
  const routes = await import('../server/routes');
  registerRoutes = routes.registerRoutes;
  console.log("Successfully imported registerRoutes function");
} catch (error) {
  console.error("Failed to import server/routes:", error);
}

// Create Express app
const app = express();

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

// Register API routes if available
if (registerRoutes) {
  console.log("Registering routes");
  try {
    registerRoutes(app);
    console.log("Routes registered successfully");
  } catch (error) {
    console.error("Error registering routes:", error);
  }
} else {
  // Add a fallback route to show debugging info
  app.get('/api/*', (req, res) => {
    res.status(500).json({
      error: "API routes not registered due to module loading issues",
      path: req.path,
      cwd: process.cwd(),
      env: process.env.NODE_ENV,
      serverExists: fs.existsSync(path.join(process.cwd(), 'server')),
    });
  });
}

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
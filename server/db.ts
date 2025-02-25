import { Pool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import ws from 'ws';
import * as schema from "@shared/schema";

let db;

if (process.env.DATABASE_URL) {
  // Use Neon/Supabase (PostgreSQL) when DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set for production. Did you forget to provision a database?");
  }

  // Configure WebSocket for Neon (only needed for Neon, not Supabase directly, but included for compatibility)
  if (process.env.NODE_ENV === 'production') {
    // @ts-ignore - WebSocket constructor typing issue
    ws.WebSocket = ws;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
} else {
  // Use SQLite locally
  const sqlite = new Database('database.sqlite');
  db = drizzleSqlite(sqlite, { schema });
}

export { db };
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Check for required environment variables
if (!process.env.SUPABASE_DATABASE_URL) {
  console.error('SUPABASE_DATABASE_URL is required in the environment');
  process.exit(1);
}

// Create a PostgreSQL connection
const connectionString = process.env.SUPABASE_DATABASE_URL;
const client = postgres(connectionString);

// Initialize drizzle with the postgres client
export const db = drizzle(client, { schema });

export default db;
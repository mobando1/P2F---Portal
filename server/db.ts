import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Only create pool/db when DATABASE_URL is available
// This file is only imported by DatabaseStorage, which is only used when DATABASE_URL exists
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT) {
    console.error("FATAL: DATABASE_URL is required in production. Refusing to start with in-memory storage.");
    process.exit(1);
  }
  console.warn("DATABASE_URL not set - database features unavailable, using in-memory storage");
}

export const pool = connectionString ? new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
}) : null;
export const db = pool ? drizzle(pool, { schema }) : null;
